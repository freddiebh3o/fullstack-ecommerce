// src/app/api/admin/products/[id]/route.ts
import { z } from "zod";
import { slugify } from "@/lib/utils/slug";
import { withAnyTenantPermission, withTenantPermission } from "@/lib/auth/guards/api";
import { ok, error } from "@/lib/api/response";
import { audit } from "@/lib/audit/audit";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug can only contain a-z, 0-9 and hyphens"),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  categorySlug: z.string().optional().or(z.literal("")),
  brandSlug: z.string().optional().or(z.literal("")),
});

// GET /api/admin/products/:id  (product.read OR product.write)
export const GET = withAnyTenantPermission(
  ["product.read", "product.write"],
  async (_req, { db, tenantId, params }) => {
    const { id } = params as { id: string };

    const product = await db.product.findFirst({
      where: { id, tenantId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
      },
    });
    if (!product) return error(404, "NOT_FOUND", "Product not found");
    return ok(product);
  }
);

// PATCH /api/admin/products/:id  (product.write)
export const PATCH = withTenantPermission(
  "product.write",
  async (req, { db, tenantId, params, session }) => {
    const { id } = params as { id: string };
    const parsedParams = paramsSchema.safeParse({ id });
    if (!parsedParams.success) return error(400, "BAD_REQUEST", "Invalid id");

    const target = await db.product.findFirst({
      where: { id, tenantId },
      include: { images: true },
    });
    if (!target) return error(404, "NOT_FOUND", "Product not found");

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }
    const data = parsed.data;

    const normalizedSlug = slugify(data.slug);

    // Slug collision within THIS tenant (excluding current)
    const slugCollision = await db.product.findFirst({
      where: { tenantId, slug: normalizedSlug, NOT: { id } },
      select: { id: true },
    });
    if (slugCollision) return error(409, "CONFLICT", "Slug already exists in this tenant");

    // Resolve category/brand within THIS tenant
    let categoryId: string | null = null;
    if (data.categorySlug) {
      const cat = await db.category.findFirst({ where: { tenantId, slug: data.categorySlug } });
      if (!cat) return error(400, "BAD_REQUEST", "Category not found");
      categoryId = cat.id;
    }

    let brandId: string | null = null;
    if (data.brandSlug) {
      const b = await db.brand.findFirst({ where: { tenantId, slug: data.brandSlug } });
      if (!b) return error(400, "BAD_REQUEST", "Brand not found");
      brandId = b.id;
    }

    const updated = await db.product.update({
      where: { id }, // unique; we've verified tenant ownership
      data: {
        name: data.name.trim(),
        slug: normalizedSlug,
        priceCents: data.priceCents,
        currency: data.currency,
        description: data.description?.trim() || null,
        categoryId,
        brandId,
      },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true, brand: true },
    });

    // Primary image handling (tenant-scoped)
    if (typeof data.imageUrl === "string") {
      const primary = updated.images[0];
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

    await audit(db, tenantId, session.user.id, "product.update", { id: updated.id, name: updated.name });

    const result = await db.product.findFirst({
      where: { id, tenantId },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true, brand: true },
    });

    return ok(result ?? updated);
  }
);

// DELETE /api/admin/products/:id  (product.write)
export const DELETE = withTenantPermission(
  "product.write",
  async (_req, { db, tenantId, params, session }) => {
    const { id } = params as { id: string };
    const parsedParams = paramsSchema.safeParse({ id });
    if (!parsedParams.success) return error(400, "BAD_REQUEST", "Invalid id");

    // Ensure in-tenant
    const exists = await db.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!exists) return error(404, "NOT_FOUND", "Product not found");

    await db.$transaction([
      db.productImage.deleteMany({ where: { productId: id, tenantId } }),
      db.product.deleteMany({ where: { id, tenantId } }),
    ]);

    await audit(db, tenantId, session.user.id, "product.delete", { id });

    return ok({ id, deleted: true });
  }
);
