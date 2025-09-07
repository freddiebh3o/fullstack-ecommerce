// src/app/api/admin/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { getTenantDb } from "@/lib/tenant-db";

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getTenantDb();
  const { id } = await params;

  // ensure belongs to this tenant (scoped)
  const exists = await db.category.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const name = parsed.data.name.trim();
  const normalizedSlug = slugify(parsed.data.slug);

  const conflict = await db.category.findFirst({
    where: { slug: normalizedSlug, NOT: { id } },
    select: { id: true },
  });
  if (conflict) return NextResponse.json({ error: "Slug already exists in this tenant" }, { status: 409 });

  const updated = await db.category.update({
    where: { id },
    data: { name, slug: normalizedSlug },
  });

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getTenantDb();
  const { id } = await params;

  // ensure belongs to this tenant
  const exists = await db.category.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ensure no products in this tenant
  const inUse = await db.product.count({ where: { categoryId: id } });
  if (inUse > 0) return NextResponse.json({ error: "Cannot delete category in use" }, { status: 400 });

  await db.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

