// src/app/api/admin/products/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiTenantCtx } from "@/lib/api-ctx";

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  priceCents: z.number().int().nonnegative(),
  currency: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  categorySlug: z.string().optional().or(z.literal("")),
  brandSlug: z.string().optional().or(z.literal("")),
});

// GET /api/admin/products  → list products for current tenant
export async function GET() {
  const ctx = await getApiTenantCtx();
  if ("error" in ctx) return ctx.error;
  const { db } = ctx;

  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
  });

  return NextResponse.json(products, { status: 200 });
}

// POST /api/admin/products  → create product in current tenant
export async function POST(req: Request) {
  const ctx = await getApiTenantCtx();
  if ("error" in ctx) return ctx.error;
  const { db, tenantId } = ctx;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }
  const data = parsed.data;

  // Ensure slug unique within tenant
  const existing = await db.product.findFirst({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already exists in this tenant" }, { status: 409 });
  }

  // Resolve category/brand (within tenant by virtue of scoped client)
  let categoryId: string | undefined = undefined;
  if (data.categorySlug) {
    const cat = await db.category.findFirst({ where: { slug: data.categorySlug } });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    categoryId = cat.id;
  }

  let brandId: string | undefined = undefined;
  if (data.brandSlug) {
    const b = await db.brand.findFirst({ where: { slug: data.brandSlug } });
    if (!b) return NextResponse.json({ error: "Brand not found" }, { status: 400 });
    brandId = b.id;
  }

  const product = await db.product.create({
    data: {
      tenantId, // keep explicit for type-safety
      name: data.name,
      slug: data.slug,
      description: data.description,
      priceCents: data.priceCents,
      currency: data.currency,
      categoryId,
      brandId,
      images: data.imageUrl
        ? { create: [{ tenantId, url: data.imageUrl, sortOrder: 0, alt: data.name }] }
        : undefined,
    },
    include: { images: true, category: true, brand: true },
  });

  return NextResponse.json(product, {
    status: 201,
    headers: { Location: `/admin/products/${product.id}/edit` },
  });
}
