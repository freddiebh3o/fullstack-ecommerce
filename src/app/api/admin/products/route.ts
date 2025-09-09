// src/app/api/admin/products/route.ts
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils/slug";
import { withAnyTenantPermission, withTenantPermission } from "@/lib/auth/guards/api";
import { ok, error } from "@/lib/api/response";
import { audit } from "@/lib/audit/audit";

const querySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt:desc", "createdAt:asc", "name:asc", "name:desc"]).default("createdAt:desc"),
});

const bodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug can only contain a-z, 0-9 and hyphens"),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  categorySlug: z.string().optional().or(z.literal("")),
  brandSlug: z.string().optional().or(z.literal("")),
});

// GET /api/admin/products  (product.read OR product.write)
export const GET = withAnyTenantPermission(
  ["product.read", "product.write"],
  async (req, { db, tenantId }) => {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid query parameters", parsed.error.flatten());
    }

    const { q, page, limit, sort } = parsed.data;
    const [sortField, sortDir] = sort.split(":") as ["createdAt" | "name", "asc" | "desc"];

    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortField === "name" ? { name: sortDir } : { createdAt: sortDir };

    const [rows, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true, slug: true } },
        },
      }),
      db.product.count({ where }),
    ]);

    return ok({
      data: rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

// POST /api/admin/products  (product.write)
export const POST = withTenantPermission(
  "product.write",
  async (req, { db, tenantId, session }) => {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }
    const data = parsed.data;

    const normalizedSlug = slugify(data.slug);

    // Ensure slug unique within tenant
    const existing = await db.product.findFirst({
      where: { tenantId, slug: normalizedSlug },
      select: { id: true },
    });
    if (existing) return error(409, "CONFLICT", "Slug already exists in this tenant");

    // Resolve category/brand within tenant
    let categoryId: string | undefined = undefined;
    if (data.categorySlug) {
      const cat = await db.category.findFirst({ where: { tenantId, slug: data.categorySlug } });
      if (!cat) return error(400, "BAD_REQUEST", "Category not found");
      categoryId = cat.id;
    }

    let brandId: string | undefined = undefined;
    if (data.brandSlug) {
      const b = await db.brand.findFirst({ where: { tenantId, slug: data.brandSlug } });
      if (!b) return error(400, "BAD_REQUEST", "Brand not found");
      brandId = b.id;
    }

    const product = await db.product.create({
      data: {
        tenantId,
        name: data.name.trim(),
        slug: normalizedSlug,
        description: data.description?.trim(),
        priceCents: data.priceCents,
        currency: data.currency,
        categoryId,
        brandId,
        images: data.imageUrl
          ? { create: [{ tenantId, url: data.imageUrl, sortOrder: 0, alt: data.name.trim() }] }
          : undefined,
      },
      include: {
        images: true,
        category: true,
        brand: true,
      },
    });

    await audit(db, tenantId, session.user.id, "product.create", { id: product.id, name: product.name });

    return ok(product, {
      status: 201,
      headers: { Location: `/admin/products/${product.id}/edit` },
    });
  }
);
