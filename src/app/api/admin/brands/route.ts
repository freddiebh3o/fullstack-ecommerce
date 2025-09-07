// src/app/api/admin/brands/route.ts
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
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db, tenantId } = await tenantDb();

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const data = parsed.data;
  const normalizedSlug = slugify(data.slug);

  const conflict = await db.brand.findFirst({ where: { slug: normalizedSlug } });
  if (conflict) return NextResponse.json({ error: "Slug already exists in this tenant" }, { status: 409 });

  const brand = await db.brand.create({
    data: {
      tenantId,
      name: data.name.trim(),
      slug: normalizedSlug,
      description: data.description || null,
      websiteUrl: data.websiteUrl || null,
      logoUrl: data.logoUrl || null,
    },
  });

  return NextResponse.json(brand, {
    status: 201,
    headers: { Location: `/admin/brands/${brand.id}/edit` },
  });
}
