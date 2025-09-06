// src/app/api/admin/products/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  priceCents: z.number().int().nonnegative(),
  currency: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  categorySlug: z.string().optional(),
  brandSlug: z.string().optional(),
});

export async function POST(req: Request) {
  // AuthZ: only ADMIN can create products
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate body
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }
  const data = parsed.data;

  // Ensure slug is unique
  const existing = await db.product.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  // Optionally attach a category by slug
  let categoryId: string | undefined = undefined;
  if (data.categorySlug) {
    const cat = await db.category.findUnique({ where: { slug: data.categorySlug } });
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    categoryId = cat.id;
  }

  let brandId: string | undefined = undefined;
  if (data.brandSlug) {
    const b = await db.brand.findUnique({ where: { slug: data.brandSlug } });
    if (!b) return NextResponse.json({ error: "Brand not found" }, { status: 400 });
    brandId = b.id;
  }

  // Create product (+ primary image if provided)
  const product = await db.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      priceCents: data.priceCents,
      currency: data.currency,
      categoryId,
      brandId,
      images: data.imageUrl
        ? { create: [{ url: data.imageUrl, sortOrder: 0, alt: data.name }] }
        : undefined,
    },
    include: { images: true, category: true },
  });

  // Return 201 Created
  return NextResponse.json(product, {
    status: 201,
    headers: { Location: `/admin/products/${product.id}/edit` },
  });
}
