// src/app/api/admin/categories/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { tenantDb } from "@/lib/tenant-db";

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
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

  const name = parsed.data.name.trim();
  const normalizedSlug = slugify(parsed.data.slug);

  // unique within tenant
  const conflict = await db.category.findFirst({ where: { slug: normalizedSlug } });
  if (conflict) return NextResponse.json({ error: "Slug already exists in this tenant" }, { status: 409 });

  const cat = await db.category.create({
    data: { tenantId, name, slug: normalizedSlug },
  });

  return NextResponse.json(cat, {
    status: 201,
    headers: { Location: `/admin/categories/${cat.id}/edit` },
  });
}
