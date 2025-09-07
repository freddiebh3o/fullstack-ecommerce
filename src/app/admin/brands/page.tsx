// src/app/admin/brands/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import BrandTable from "@/components/admin/brand-table";
import Pagination from "@/components/ui/pagination";
import BrandSearch from "@/components/admin/brand-search";
import { Prisma } from "@prisma/client";
import { getCurrentTenantId } from "@/lib/tenant";

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { q = "", page = "1" } = (await searchParams) || {};
  const pageSize = 10;
  const pageNum = Math.max(parseInt(page || "1", 10) || 1, 1);

  const where: Prisma.BrandWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { slug: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      }
    : {};

  const total = await db.brand.count({ where });
  const brands = await db.brand.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
    take: pageSize,
    skip: (pageNum - 1) * pageSize,
  });

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Brands</h1>
          <p className="text-sm text-muted-foreground">
            {total} item{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BrandSearch key={`q-${q}`} initialQuery={q} />
          <Link
            href="/admin/brands/new"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
          >
            New Brand
          </Link>
        </div>
      </div>

      <BrandTable brands={brands} />

      <Pagination current={pageNum} totalPages={totalPages} q={q} />
    </div>
  );
}
