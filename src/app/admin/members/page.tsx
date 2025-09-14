// src/app/admin/members/page.tsx
import Link from "next/link";
import { tenantDb } from "@/lib/db/tenant-db";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission, ensurePagePermission } from "@/lib/auth/guards/page";
import { Button } from "@/components/ui/button";
import AdminIndexShell from "@/components/admin/index/admin-index-shell";
import DataToolbar from "@/components/admin/index/data-toolbar";
import DataPager from "@/components/admin/index/data-pager";
import MemberTable from "@/components/admin/member-table";
import { Prisma } from "@prisma/client";
import { parseIndexQuery } from "@/lib/paging/query";

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : undefined;
}
function dateISO(v: unknown) {
  const s = str(v);
  if (!s) return undefined; // expect yyyy-mm-dd
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const perm = await ensureAnyPagePermission(["member.read", "member.manage"]);
  if (!perm.allowed) return <ForbiddenPage />;
  const { db } = await tenantDb();

  // can the viewer manage members?
  const mayManage = (await ensurePagePermission("member.manage")).allowed;

  // ---- Parse query (page/per/sort/dir/q) ----
  const sp = (await searchParams) ?? {};
  const q = parseIndexQuery(sp);

  // Optional filters
  const roleKey = str(sp.roleKey);
  const createdFrom = dateISO(sp.createdFrom);
  const createdTo = dateISO(sp.createdTo);
  const createdToNext =
    createdTo ? new Date(createdTo.getFullYear(), createdTo.getMonth(), createdTo.getDate() + 1) : undefined;

  // Map sort key → Prisma orderBy
  const sortMap: Record<string, Prisma.MembershipOrderByWithRelationInput> = {
    createdAt: { createdAt: q.dir },
    name: { user: { name: q.dir } },
    email: { user: { email: q.dir } },
    role: { role: { name: q.dir } },
  };
  const orderBy = sortMap[q.sort] ?? sortMap.createdAt;

  // Where clause
  const where: Prisma.MembershipWhereInput = {
    ...(q.q
      ? {
          OR: [
            { user: { name: { contains: q.q, mode: Prisma.QueryMode.insensitive } } },
            { user: { email: { contains: q.q, mode: Prisma.QueryMode.insensitive } } },
            { role: { name: { contains: q.q, mode: Prisma.QueryMode.insensitive } } },
            { role: { key: { contains: q.q, mode: Prisma.QueryMode.insensitive } } },
          ],
        }
      : {}),
    ...(roleKey ? { role: { key: roleKey } } : {}),
    ...(createdFrom || createdToNext
      ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdToNext ? { lt: createdToNext } : {}) } }
      : {}),
  };

  // Pagination
  const skip = (q.page - 1) * q.per;
  const take = q.per;

  const [members, total, roles] = await Promise.all([
    db.membership.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, key: true, name: true } },
      },
    }),
    db.membership.count({ where }),
    db.role.findMany({
      select: { id: true, key: true, name: true },
      orderBy: { key: "asc" },
    }),
  ]);

  return (
    <AdminIndexShell
      title="Members"
      description="Manage who has access to this tenant."
      action={
        mayManage ? (
          <Button asChild>
            <Link href="/admin/members/new">Add Member</Link>
          </Button>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Toolbar */}
        <DataToolbar
          search={{ name: "q", value: q.q || "", placeholder: "Search by name, email, or role…", label: "Search" }}
          filters={[
            {
              id: "role",
              kind: "select",
              label: "Role",
              name: "roleKey",
              value: typeof sp.roleKey === "string" ? sp.roleKey : "",
              options: roles.map((r) => ({ value: r.key, label: r.name })),
              allowEmpty: true,
              placeholder: "Any role",
            },
            {
              id: "created",
              kind: "dateRange",
              label: "Added Between",
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
            { value: "createdAt", label: "Added" },
            { value: "name", label: "Name" },
            { value: "email", label: "Email" },
            { value: "role", label: "Role" },
          ]}
          collapsible={true}
        />

        {/* Table */}
        <div className="min-h-0 flex-1">
          <MemberTable members={members as any} roles={roles as any} mayManage={mayManage} />
        </div>

        {/* Pager */}
        <div className="pt-1">
          <DataPager
            basePath="/admin/members"
            page={q.page}
            per={q.per}
            total={total}
            q={q.q}
            sort={q.sort}
            dir={q.dir}
            params={{
              roleKey: typeof (sp as any).roleKey === "string" ? (sp as any).roleKey : undefined,
              createdFrom: typeof (sp as any).createdFrom === "string" ? (sp as any).createdFrom : undefined,
              createdTo: typeof (sp as any).createdTo === "string" ? (sp as any).createdTo : undefined,
            }}
          />
        </div>
      </div>
    </AdminIndexShell>
  );
}
