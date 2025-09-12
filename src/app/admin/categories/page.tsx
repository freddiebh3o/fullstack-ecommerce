// src/app/admin/categories/page.tsx
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import CategoryTable from "@/components/admin/category-table";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission } from "@/lib/auth/guards/page";
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
function dateISO(v: unknown) {
  const s = str(v);
  if (!s) return undefined; // expect yyyy-mm-dd
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Allow users with either read or write
  const perm = await ensureAnyPagePermission(["category.read", "category.write"]);
  if (!perm.allowed) return <ForbiddenPage />;
  const { tenantId } = perm;

  const mayWrite = await can("category.write", tenantId);

  // ---- Parse query (page/per/sort/dir/q) ----
  const sp = (await searchParams) ?? {};
  const q = parseIndexQuery(sp);

  // Map sort key → Prisma orderBy
  const sortMap: Record<string, Prisma.CategoryOrderByWithRelationInput> = {
    createdAt: { createdAt: q.dir },
    name: { name: q.dir },
  };
  const orderBy = sortMap[q.sort] ?? sortMap.createdAt;

  // Date filters
  const createdFrom = dateISO(sp.createdFrom); // inclusive
  const createdTo = dateISO(sp.createdTo);     // inclusive end-of-day
  const createdToNext =
    createdTo ? new Date(createdTo.getFullYear(), createdTo.getMonth(), createdTo.getDate() + 1) : undefined;

  // Where clause (tenant + optional search + dates)
  const where: Prisma.CategoryWhereInput = {
    tenantId,
    ...(q.q
      ? {
          OR: [
            { name: { contains: q.q, mode: Prisma.QueryMode.insensitive } },
            { slug: { contains: q.q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
    ...(createdFrom || createdToNext
      ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdToNext ? { lt: createdToNext } : {}) } }
      : {}),
  };

  // Pagination
  const skip = (q.page - 1) * q.per;
  const take = q.per;

  // Fetch rows + total
  const [categories, total] = await Promise.all([
    db.category.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    }),
    db.category.count({ where }),
  ]);

  return (
    <AdminIndexShell
      title="Categories"
      description="Group and organize your product catalog."
      action={
        mayWrite ? (
          <Button asChild>
            <Link href="/admin/categories/new">New Category</Link>
          </Button>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Toolbar */}
        <DataToolbar
          search={{ name: "q", value: q.q || "", placeholder: "Search categories...", label: "Search" }}
          filters={[
            {
              id: "created",
              kind: "dateRange",
              label: "Created Between",
              fromName: "createdFrom",
              toName: "createdTo",
              from: typeof sp.createdFrom === "string" ? sp.createdFrom : "",
              to: typeof sp.createdTo === "string" ? sp.createdTo : "",
              colSpan: "lg:col-span-2",
            },
          ]}
          sort={q.sort}
          dir={q.dir}
          per={q.per}
          perOptions={[10, 20, 50, 100]}
          sortOptions={[
            { value: "createdAt", label: "Created" },
            { value: "name", label: "Name" },
          ]}
          collapsible={true}
        />

        {/* Table */}
        <div className="min-h-0 flex-1">
          <CategoryTable
            categories={categories}
            mayWrite={mayWrite}
          />
        </div>

        {/* Pager */}
        <div className="pt-1">
          <DataPager
            basePath="/admin/categories"
            page={q.page}
            per={q.per}
            total={total}
            q={q.q}
            sort={q.sort}
            dir={q.dir}
            params={{
              createdFrom: typeof (sp as any).createdFrom === "string" ? (sp as any).createdFrom : undefined,
              createdTo: typeof (sp as any).createdTo === "string" ? (sp as any).createdTo : undefined,
            }}
          />
        </div>
      </div>
    </AdminIndexShell>
  );
}
