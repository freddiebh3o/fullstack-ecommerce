// src/app/admin/products/page.tsx
import Link from "next/link";
import { tenantDb } from "@/lib/db/tenant-db";
import ProductTable from "@/components/admin/product-table";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission, ensurePagePermission } from "@/lib/auth/guards/page";
import { can } from "@/lib/auth/permissions";
import AdminIndexShell from "@/components/admin/index/admin-index-shell";
import DataToolbar from "@/components/admin/index/data-toolbar";
import DataPager from "@/components/admin/index/data-pager";
import { Prisma } from "@prisma/client";
import { parseIndexQuery } from "@/lib/paging/query";
import { Button } from "@/components/ui/button";

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : undefined;
}
function num(v: unknown) {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
function dateISO(v: unknown) {
  const s = str(v);
  if (!s) return undefined; // expect yyyy-mm-dd
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

export default async function AdminProductsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perm = await ensureAnyPagePermission(["product.read", "product.write"]);
  if (!perm.allowed) return <ForbiddenPage />;
  const { db } = await tenantDb();

  const mayWrite = (await ensurePagePermission("product.write")).allowed;

  // ---- Parse query (page/per/sort/dir/q) ----
  const sp = await searchParams;
  const q = parseIndexQuery(sp);

  // Map sort key → Prisma orderBy
  const sortMap: Record<string, Prisma.ProductOrderByWithRelationInput> = {
    createdAt: { createdAt: q.dir },
    name: { name: q.dir },
    priceCents: { priceCents: q.dir },
    stock: { stock: q.dir },
  };
  const orderBy = sortMap[q.sort] ?? sortMap.createdAt;

  const categoryId = str(sp.categoryId);
  const brandId = str(sp.brandId);

  // prices typed in pounds -> convert to cents
  const priceMinPounds = num(sp.priceMin);
  const priceMaxPounds = num(sp.priceMax);
  const priceMinCents = priceMinPounds !== undefined ? Math.round(priceMinPounds * 100) : undefined;
  const priceMaxCents = priceMaxPounds !== undefined ? Math.round(priceMaxPounds * 100) : undefined;

  const stockMin = num(sp.stockMin);
  const stockMax = num(sp.stockMax);

  const createdFrom = dateISO(sp.createdFrom); // inclusive
  const createdTo = dateISO(sp.createdTo);     // inclusive end-of-day
  // Make createdTo inclusive by advancing 1 day and using lt
  const createdToNext =
    createdTo ? new Date(createdTo.getFullYear(), createdTo.getMonth(), createdTo.getDate() + 1) : undefined;

  // Where clause (server-side searching)
  const where: Prisma.ProductWhereInput = {
    ...(q.q
      ? {
          OR: [
            { name: { contains: q.q, mode: Prisma.QueryMode.insensitive } },
            { slug: { contains: q.q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(priceMinCents !== undefined || priceMaxCents !== undefined
      ? { priceCents: { ...(priceMinCents !== undefined ? { gte: priceMinCents } : {}),
                        ...(priceMaxCents !== undefined ? { lte: priceMaxCents } : {}) } }
      : {}),
    ...(stockMin !== undefined || stockMax !== undefined
      ? { stock: { ...(stockMin !== undefined ? { gte: stockMin } : {}),
                   ...(stockMax !== undefined ? { lte: stockMax } : {}) } }
      : {}),
    ...(createdFrom || createdToNext
      ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}),
                       ...(createdToNext ? { lt: createdToNext } : {}) } }
      : {}),
  };
  // Pagination
  const skip = (q.page - 1) * q.per;
  const take = q.per;

  // Fetch rows + total
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        priceCents: true,
        currency: true,
        stock: true,
        createdAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { select: { id: true, url: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    db.product.count({ where }),
  ]);

  const categories = await db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const brands = await db.brand.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AdminIndexShell
      title="Products"
      description="Manage your product catalog."
      action={
        mayWrite ? (
          <Button asChild>
            <Link href="/admin/products/new">
              New Product
            </Link>
          </Button>
        ) : undefined
      }
    >
      {/* Toolbar (client) */}
      <DataToolbar
        search={{ name: "q", value: q.q || "", placeholder: "Search products...", label: "Search" }}
        filters={[
          {
            id: "cat",
            kind: "select",
            label: "Category",
            name: "categoryId",
            value: typeof sp.categoryId === "string" ? sp.categoryId : "",
            options: categories.map(c => ({ value: c.id, label: c.name || "Untitled" })),
            allowEmpty: true,
            placeholder: "Any category",
          },
          {
            id: "brand",
            kind: "select",
            label: "Brand",
            name: "brandId",
            value: typeof sp.brandId === "string" ? sp.brandId : "",
            options: brands.map(b => ({ value: b.id, label: b.name || "Untitled" })),
            allowEmpty: true,
            placeholder: "Any brand",
          },
          {
            id: "price",
            kind: "numberRange",
            label: "Price (£)",
            minName: "priceMin",
            maxName: "priceMax",
            min: typeof sp.priceMin === "string" ? sp.priceMin : "",
            max: typeof sp.priceMax === "string" ? sp.priceMax : "",
            step: 1,
          },
          {
            id: "stock",
            kind: "numberRange",
            label: "Stock",
            minName: "stockMin",
            maxName: "stockMax",
            min: typeof sp.stockMin === "string" ? sp.stockMin : "",
            max: typeof sp.stockMax === "string" ? sp.stockMax : "",
            step: 1,
          },
          {
            id: "created",
            kind: "dateRange",
            label: "Created Between",
            fromName: "createdFrom",
            toName: "createdTo",
            from: typeof sp.createdFrom === "string" ? sp.createdFrom : "",
            to: typeof sp.createdTo === "string" ? sp.createdTo : "",
            colSpan: "lg:col-span-2", // make it wider if you want
          },
        ]}
        sort={q.sort}
        dir={q.dir}
        per={q.per}
        perOptions={[10, 20, 50, 100]}
        sortOptions={[
          { value: "createdAt", label: "Created" },
          { value: "name", label: "Name" },
          { value: "priceCents", label: "Price" },
          { value: "stock", label: "Stock" },
        ]}
        collapsible={true}
      />

      {/* Table (client) */}
      <ProductTable
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceCents: p.priceCents,
          currency: p.currency,
          stock: p.stock,
          createdAt: p.createdAt,
          category: p.category ? { name: p.category.name } : null,
          brand: p.brand ? { name: p.brand.name } : null,
          images: p.images ?? [],
        }))}
        mayWrite={mayWrite}
      />

      {/* Pager (client) */}
      <DataPager
        basePath="/admin/products"
        page={q.page}
        per={q.per}
        total={total}
        q={q.q}
        sort={q.sort}
        dir={q.dir}
        params={{
          categoryId: typeof sp.categoryId === "string" ? sp.categoryId : undefined,
          brandId: typeof sp.brandId === "string" ? sp.brandId : undefined,
          priceMin: typeof sp.priceMin === "string" ? sp.priceMin : undefined,
          priceMax: typeof sp.priceMax === "string" ? sp.priceMax : undefined,
          stockMin: typeof sp.stockMin === "string" ? sp.stockMin : undefined,
          stockMax: typeof sp.stockMax === "string" ? sp.stockMax : undefined,
          createdFrom: typeof sp.createdFrom === "string" ? sp.createdFrom : undefined,
          createdTo: typeof sp.createdTo === "string" ? sp.createdTo : undefined,
        }}
      />
    </AdminIndexShell>
  );
}
