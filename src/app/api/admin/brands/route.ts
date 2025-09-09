// src/app/api/admin/brands/route.ts
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils/slug";
import { withAnyTenantPermission, withTenantPermission } from "@/lib/auth/guards/api";
import { ok, error } from "@/lib/api/response";
import { audit } from "@/lib/audit/audit";

const bodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters")
         .regex(/^[a-z0-9-]+$/, "Slug can only contain a-z, 0-9 and hyphens"),
  description: z.string().optional(),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

const querySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt:desc", "createdAt:asc", "name:asc", "name:desc"]).default("createdAt:desc"),
});

// GET /api/admin/brands  (brand.read OR brand.write)
export const GET = withAnyTenantPermission(
  ["brand.read", "brand.write"],
  async (req, { db, tenantId }) => {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid query parameters", parsed.error.flatten());
    }

    const { q, page, limit, sort } = parsed.data;
    const [sortField, sortDir] = sort.split(":") as ["createdAt" | "name", "asc" | "desc"];

    const where: Prisma.BrandWhereInput = {
      tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.BrandOrderByWithRelationInput =
      sortField === "name" ? { name: sortDir } : { createdAt: sortDir };

    const [rows, total] = await Promise.all([
      db.brand.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { products: true } } },
      }),
      db.brand.count({ where }),
    ]);

    return ok({
      data: rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

// POST /api/admin/brands  (brand.write)
export const POST = withTenantPermission(
  "brand.write",
  async (req, { db, tenantId, session }) => {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }

    const data = parsed.data;
    const normalizedSlug = slugify(data.slug);

    // scope uniqueness by tenant
    const conflict = await db.brand.findFirst({
      where: { tenantId, slug: normalizedSlug },
      select: { id: true },
    });
    if (conflict) return error(409, "CONFLICT", "Slug already exists in this tenant");

    const brand = await db.brand.create({
      data: {
        tenantId,
        name: data.name.trim(),
        slug: normalizedSlug,
        description: data.description?.trim() || null,
        websiteUrl: data.websiteUrl?.trim() || null,
        logoUrl: data.logoUrl?.trim() || null,
      },
    });

    await audit(db, tenantId, session.user.id, "brand.create", { id: brand.id, name: brand.name });

    return ok(brand, {
      status: 201,
      headers: { Location: `/admin/brands/${brand.id}/edit` },
    });
  }
);
