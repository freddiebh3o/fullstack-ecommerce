// src/app/api/admin/products/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiTenantCtx } from "@/lib/api-ctx";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  categorySlug: z.string().optional().or(z.literal("")),
  brandSlug: z.string().optional().or(z.literal("")),
});

// DELETE /api/admin/products/:id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getApiTenantCtx();
  if ("error" in ctx) return ctx.error;
  const { db, tenantId } = ctx;

  const { id } = await params;
  const parsedParams = paramsSchema.safeParse({ id });
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Ensure item exists in this tenant
  const exists = await db.product.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.$transaction([
    db.productImage.deleteMany({ where: { productId: id, tenantId } }),
    // scoped delete for belt-and-braces safety
    db.product.deleteMany({ where: { id, tenantId } }),
  ]);

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/products/:id
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getApiTenantCtx();
  if ("error" in ctx) return ctx.error;
  const { db, tenantId } = ctx;

  const { id } = await params;
  const parsedParams = paramsSchema.safeParse({ id });
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }
  const data = parsed.data;

  // Ensure target exists in this tenant
  const target = await db.product.findFirst({
    where: { id, tenantId },
    include: { images: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Slug collision within THIS tenant (excluding current)
  const slugCollision = await db.product.findFirst({
    where: { tenantId, slug: data.slug, NOT: { id } },
    select: { id: true },
  });
  if (slugCollision) {
    return NextResponse.json(
      { error: "Slug already in use in this tenant" },
      { status: 409 }
    );
  }

  // Resolve category/brand within THIS tenant
  let categoryId: string | null = null;
  if (data.categorySlug) {
    const cat = await db.category.findFirst({
      where: { tenantId, slug: data.categorySlug },
      select: { id: true },
    });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    categoryId = cat.id;
  }

  let brandId: string | null = null;
  if (data.brandSlug) {
    const b = await db.brand.findFirst({
      where: { tenantId, slug: data.brandSlug },
      select: { id: true },
    });
    if (!b) return NextResponse.json({ error: "Brand not found" }, { status: 400 });
    brandId = b.id;
  }

  const updated = await db.product.update({
    where: { id }, // id is unique; we've already verified tenant ownership
    data: {
      name: data.name,
      slug: data.slug,
      priceCents: data.priceCents,
      currency: data.currency,
      description: data.description || null,
      categoryId,
      brandId,
    },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true, brand: true },
  });

  // Primary image handling (tenant-scoped)
  if (typeof data.imageUrl === "string") {
    const primary = updated.images.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (data.imageUrl === "") {
      await db.productImage.deleteMany({ where: { productId: id, tenantId } });
    } else if (primary) {
      await db.productImage.update({
        where: { id: primary.id },
        data: { url: data.imageUrl, alt: updated.name, sortOrder: 0 },
      });
    } else {
      await db.productImage.create({
        data: { tenantId, productId: id, url: data.imageUrl, alt: updated.name, sortOrder: 0 },
      });
    }
  }

  const result = await db.product.findFirst({
    where: { id, tenantId },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true, brand: true },
  });

  return NextResponse.json(result, { status: 200 });
}
