// src/app/admin/roles/page.tsx
import Link from "next/link";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import { tenantDb } from "@/lib/db/tenant-db";
import { can } from "@/lib/auth/permissions";
import AdminIndexShell from "@/components/admin/index/admin-index-shell";
import DataToolbar from "@/components/admin/index/data-toolbar";
import DataPager from "@/components/admin/index/data-pager";
import RolesTable from "@/components/admin/roles-table";
import { Prisma } from "@prisma/client";
import { parseIndexQuery } from "@/lib/paging/query";
import { Button } from "@/components/ui/button";

export default async function RolesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perm = await ensurePagePermission("role.manage");
  if (!perm.allowed) return <ForbiddenPage />;
  const { db } = await tenantDb();

  const mayManage = (await ensurePagePermission("role.manage")).allowed;

  const sp = (await searchParams) ?? {};
  const q = parseIndexQuery(sp);

  // Sort map (NO createdAt on Role)
  const sortMap: Record<string, Prisma.RoleOrderByWithRelationInput> = {
    name: { name: q.dir },
    key: { key: q.dir },
    builtin: { builtin: q.dir },
    members: { memberships: { _count: q.dir } } as any,
  };
  const orderBy = sortMap[q.sort] ?? sortMap.name;

  const where: Prisma.RoleWhereInput = {
    ...(q.q
      ? {
          OR: [
            { name: { contains: q.q, mode: Prisma.QueryMode.insensitive } },
            { key: { contains: q.q, mode: Prisma.QueryMode.insensitive } },
            { permissions: { some: { permission: { key: { contains: q.q, mode: Prisma.QueryMode.insensitive } } } } },
          ],
        }
      : {}),
  };

  const skip = (q.page - 1) * q.per;
  const take = q.per;

  const [roles, total] = await Promise.all([
    db.role.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { memberships: true } },
      },
    }),
    db.role.count({ where }),
  ]);

  const rows = roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    builtin: r.builtin,
    description: r.description ?? null,
    permissionKeys: r.permissions.map((p) => p.permission.key),
    members: r._count.memberships,
  }));

  return (
    <AdminIndexShell
      title="Roles"
      description="Define and manage tenant roles & permissions."
      action={
        mayManage ? (
          <Button asChild>
            <Link href="/admin/roles/new">New Role</Link>
          </Button>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Toolbar (no date filter) */}
        <DataToolbar
          search={{ name: "q", value: q.q || "", placeholder: "Search name, key, or permission…", label: "Search" }}
          filters={[]}
          sort={q.sort}
          dir={q.dir}
          per={q.per}
          perOptions={[10, 20, 50, 100]}
          sortOptions={[
            { value: "name", label: "Name" },
            { value: "key", label: "Key" },
            { value: "members", label: "Members" },
            { value: "builtin", label: "Built-in" },
          ]}
          collapsible={true}
        />

        {/* Table */}
        <div className="min-h-0 flex-1">
          <RolesTable roles={rows} mayManage={mayManage} />
        </div>

        {/* Pager */}
        <div className="pt-1">
          <DataPager
            basePath="/admin/roles"
            page={q.page}
            per={q.per}
            total={total}
            q={q.q}
            sort={q.sort}
            dir={q.dir}
          />
        </div>
      </div>
    </AdminIndexShell>
  );
}
