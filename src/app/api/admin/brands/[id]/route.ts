// src/app/api/admin/brands/[id]/route.ts
import { z } from "zod";
import { slugify } from "@/lib/utils/slug";
import { withAnyTenantPermission, withTenantPermission } from "@/lib/auth/guards/api";
import { ok, error } from "@/lib/api/response";
import { audit } from "@/lib/audit/audit";

const bodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain a-z, 0-9 and hyphens"),
  description: z.string().optional(),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

// GET /api/admin/brands/:id  (brand.read OR brand.write)
export const GET = withAnyTenantPermission(
  ["brand.read", "brand.write"],
  async (_req, { db, tenantId, params }) => {
    const { id } = params as { id: string };

    const brand = await db.brand.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) return error(404, "NOT_FOUND", "Brand not found");
    return ok(brand);
  }
);

// PATCH /api/admin/brands/:id  (brand.write)
export const PATCH = withTenantPermission(
  "brand.write",
  async (req, { db, tenantId, params, session }) => {
    const { id } = params as { id: string };

    const exists = await db.brand.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!exists) return error(404, "NOT_FOUND", "Brand not found");

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }

    const data = parsed.data;
    const normalizedSlug = slugify(data.slug);

    // per-tenant slug uniqueness excluding self
    const conflict = await db.brand.findFirst({
      where: { tenantId, slug: normalizedSlug, NOT: { id } },
      select: { id: true },
    });
    if (conflict) return error(409, "CONFLICT", "Slug already exists in this tenant");

    const updated = await db.brand.update({
      where: { id },
      data: {
        name: data.name.trim(),
        slug: normalizedSlug,
        description: data.description?.trim() || null,
        websiteUrl: data.websiteUrl?.trim() || null,
        logoUrl: data.logoUrl?.trim() || null,
      },
    });

    await audit(db, tenantId, session.user.id, "brand.update", {
      id: updated.id,
      name: updated.name,
    });

    return ok(updated);
  }
);

// DELETE /api/admin/brands/:id  (brand.write)
export const DELETE = withTenantPermission(
  "brand.write",
  async (_req, { db, tenantId, params, session }) => {
    const { id } = params as { id: string };

    const exists = await db.brand.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!exists) return error(404, "NOT_FOUND", "Brand not found");

    const inUse = await db.product.count({ where: { tenantId, brandId: id } });
    if (inUse > 0) {
      return error(400, "BAD_REQUEST", "Cannot delete a brand that is used by products");
    }

    await db.brand.delete({ where: { id } });
    await audit(db, tenantId, session.user.id, "brand.delete", { id });

    return ok({ id, deleted: true });
  }
);
