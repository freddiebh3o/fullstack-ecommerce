// src/app/admin/brands/page.tsx
import Link from "next/link";
import { tenantDb } from "@/lib/db/tenant-db";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission, ensurePagePermission } from "@/lib/auth/guards/page";
import { can } from "@/lib/auth/permissions";
import AdminIndexShell from "@/components/admin/index/admin-index-shell";
import DataToolbar from "@/components/admin/index/data-toolbar";
import DataPager from "@/components/admin/index/data-pager";
import BrandTable from "@/components/admin/brand-table";
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

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // View allowed for read OR write
  const perm = await ensureAnyPagePermission(["brand.read", "brand.write"]);
  if (!perm.allowed) return <ForbiddenPage />;
  const { db } = await tenantDb();

  const mayWrite = (await ensurePagePermission("brand.write")).allowed;

  // ---- Parse query (page/per/sort/dir/q) ----
  const sp = (await searchParams) ?? {};
  const q = parseIndexQuery(sp);

  // Map sort key → Prisma orderBy
  const sortMap: Record<string, Prisma.BrandOrderByWithRelationInput> = {
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
  const where: Prisma.BrandWhereInput = {
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
  const [brands, total] = await Promise.all([
    db.brand.findMany({
      where, 
      orderBy, 
      skip, 
      take, 
      select: { 
        id:true, 
        name:true, 
        slug:true, 
        logoUrl:true, 
        createdAt:true,
        _count:{
          select:{ 
            products:true 
          }
        }
      }
    }),
    db.brand.count({ where }),
  ]);

  return (
    <AdminIndexShell
      title="Brands"
      description="Manage your brands and their logos."
      action={
        mayWrite ? (
          <Button asChild>
            <Link href="/admin/brands/new">New Brand</Link>
          </Button>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Toolbar */}
        <DataToolbar
          search={{ name: "q", value: q.q || "", placeholder: "Search brands...", label: "Search" }}
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
          <BrandTable brands={brands as any} mayWrite={mayWrite} />
        </div>

        {/* Pager */}
        <div className="pt-1">
          <DataPager
            basePath="/admin/brands"
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
