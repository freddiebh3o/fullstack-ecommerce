// src/app/api/admin/categories/[id]/route.ts
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { withAnyTenantPermission, withTenantPermission } from "@/lib/route-guard";
import { ok, error } from "@/lib/api-response";
import { audit } from "@/lib/audit";

const bodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters")
         .regex(/^[a-z0-9-]+$/, "Slug can only contain a-z, 0-9 and hyphens"),
});

// GET /api/admin/categories/:id  (category.read OR category.write)
export const GET = withAnyTenantPermission(
  ["category.read", "category.write"],
  async (_req, { db, tenantId, params }) => {
    const { id } = params as { id: string };

    const cat = await db.category.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { products: true } } },
    });
    if (!cat) return error(404, "NOT_FOUND", "Category not found");
    return ok(cat);
  }
);

// PATCH /api/admin/categories/:id  (category.write)
export const PATCH = withTenantPermission(
  "category.write",
  async (req, { db, tenantId, params, session }) => {  // <-- add session
    const { id } = params as { id: string };

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }

    const exists = await db.category.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!exists) return error(404, "NOT_FOUND", "Category not found");

    const normalizedSlug = slugify(parsed.data.slug);

    const conflict = await db.category.findFirst({
      where: { tenantId, slug: normalizedSlug, NOT: { id } },
      select: { id: true },
    });
    if (conflict) return error(409, "CONFLICT", "Slug already exists in this tenant");

    const updated = await db.category.update({
      where: { id },
      data: { name: parsed.data.name, slug: normalizedSlug },
    });

    await audit(db, tenantId, session.user.id, "category.update", { id: updated.id, name: updated.name }); // <-- session here

    return ok(updated);
  }
);

// DELETE /api/admin/categories/:id  (category.write)
export const DELETE = withTenantPermission(
  "category.write",
  async (_req, { db, tenantId, params, session }) => { // <-- add session
    const { id } = params as { id: string };

    const exists = await db.category.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!exists) return error(404, "NOT_FOUND", "Category not found");

    const inUse = await db.product.count({ where: { tenantId, categoryId: id } });
    if (inUse > 0) {
      return error(400, "BAD_REQUEST", "Cannot delete a category that is used by products");
    }

    await db.category.delete({ where: { id } });
    await audit(db, tenantId, session.user.id, "category.delete", { id }); // <-- session here

    return ok({ id, deleted: true });
  }
);
