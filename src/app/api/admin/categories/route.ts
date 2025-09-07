// src/app/api/admin/categories/route.ts
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/slug";
import { withAnyTenantPermission, withTenantPermission } from "@/lib/route-guard";
import { ok, error } from "@/lib/api-response";
import { audit } from "@/lib/audit";

const bodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters")
         .regex(/^[a-z0-9-]+$/, "Slug can only contain a-z, 0-9 and hyphens"),
});

const querySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt:desc", "createdAt:asc", "name:asc", "name:desc"]).default("createdAt:desc"),
});

// GET /api/admin/categories  (category.read OR category.write)
export const GET = withAnyTenantPermission(
  ["category.read", "category.write"],
  async (req, { db, tenantId }) => {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid query parameters", parsed.error.flatten());
    }

    const { q, page, limit, sort } = parsed.data;
    const [sortField, sortDir] = sort.split(":") as ["createdAt" | "name", "asc" | "desc"];

    const where: Prisma.CategoryWhereInput = {
      tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
              { slug: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CategoryOrderByWithRelationInput =
      sortField === "name" ? { name: sortDir } : { createdAt: sortDir };

    const [rows, total] = await Promise.all([
      db.category.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { products: true } } },
      }),
      db.category.count({ where }),
    ]);

    return ok({
      data: rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

// POST /api/admin/categories  (category.write)
export const POST = withTenantPermission(
  "category.write",
  async (req, { db, tenantId, session }) => { // <-- add session
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }

    const normalizedSlug = slugify(parsed.data.slug);

    const conflict = await db.category.findFirst({ where: { tenantId, slug: normalizedSlug } });
    if (conflict) {
      return error(409, "CONFLICT", "Slug already exists in this tenant");
    }

    const cat = await db.category.create({
      data: { tenantId, name: parsed.data.name, slug: normalizedSlug },
    });

    await audit(db, tenantId, session.user.id, "category.create", { id: cat.id, name: cat.name }); // <-- session here

    return ok(cat, {
      status: 201,
      headers: { Location: `/admin/categories/${cat.id}/edit` },
    });
  }
);
