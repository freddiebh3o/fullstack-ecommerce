// src/app/api/admin/brands/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { tenantDb } from "@/lib/tenant-db";

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db } = await tenantDb();
  const { id } = await params;

  // ensure brand belongs to tenant (scoped)
  const exists = await db.brand.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const data = parsed.data;
  const normalizedSlug = slugify(data.slug);

  const conflict = await db.brand.findFirst({
    where: { slug: normalizedSlug, NOT: { id } },
    select: { id: true },
  });
  if (conflict) return NextResponse.json({ error: "Slug already exists in this tenant" }, { status: 409 });

  const updated = await db.brand.update({
    where: { id },
    data: {
      name: data.name.trim(),
      slug: normalizedSlug,
      description: data.description || null,
      websiteUrl: data.websiteUrl || null,
      logoUrl: data.logoUrl || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db } = await tenantDb();
  const { id } = await params;

  // ensure brand belongs to tenant
  const exists = await db.brand.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // block delete if in use within this tenant
  const count = await db.product.count({ where: { brandId: id } });
  if (count > 0) return NextResponse.json({ error: "Cannot delete brand in use" }, { status: 400 });

  await db.brand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
