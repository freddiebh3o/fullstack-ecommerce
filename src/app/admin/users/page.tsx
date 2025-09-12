// src/app/admin/users/page.tsx
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import UserTable from "@/components/admin/user-table";
import ForbiddenPage from "@/app/403/page";
import { ensureSystemRole } from "@/lib/auth/guards/system";
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Only ADMIN / SUPERADMIN may view Users
  const guard = await ensureSystemRole(["ADMIN", "SUPERADMIN"]);
  if (!guard.allowed) return <ForbiddenPage />;

  const currentUserId = (guard.session.user as any)?.id ?? null;

  // ---- Parse query (page/per/sort/dir/q) ----
  const sp = (await searchParams) ?? {};
  const q = parseIndexQuery(sp);

  // Optional filters
  const role = str(sp.role); // ADMIN | USER | SUPERADMIN
  const createdFrom = dateISO(sp.createdFrom);
  const createdTo = dateISO(sp.createdTo);
  const createdToNext =
    createdTo ? new Date(createdTo.getFullYear(), createdTo.getMonth(), createdTo.getDate() + 1) : undefined;

  // Map sort key → Prisma orderBy
  const sortMap: Record<string, Prisma.UserOrderByWithRelationInput> = {
    createdAt: { createdAt: q.dir },
    email: { email: q.dir },
    name: { name: q.dir },
    role: { role: q.dir },
  };
  const orderBy = sortMap[q.sort] ?? sortMap.createdAt;

  // Where clause
  const where: Prisma.UserWhereInput = {
    ...(q.q
      ? {
          OR: [
            { email: { contains: q.q, mode: Prisma.QueryMode.insensitive } },
            { name: { contains: q.q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
    ...(role ? { role: role as any } : {}),
    ...(createdFrom || createdToNext
      ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdToNext ? { lt: createdToNext } : {}) } }
      : {}),
  };

  // Pagination
  const skip = (q.page - 1) * q.per;
  const take = q.per;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      skip,
      take,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    db.user.count({ where }),
  ]);

  return (
    <AdminIndexShell
      title="Users"
      description="Internal system users (admins & staff)."
      action={
        <Button asChild>
          <Link href="/admin/users/new">New User</Link>
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Toolbar */}
        <DataToolbar
          search={{ name: "q", value: q.q || "", placeholder: "Search email or name…", label: "Search" }}
          filters={[
            {
              id: "role",
              kind: "select",
              label: "Role",
              name: "role",
              value: typeof sp.role === "string" ? sp.role : "",
              options: [
                { value: "SUPERADMIN", label: "Superadmin" },
                { value: "ADMIN", label: "Admin" },
                { value: "USER", label: "Customer" },
              ],
              allowEmpty: true,
              placeholder: "Any role",
            },
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
            { value: "email", label: "Email" },
            { value: "name", label: "Name" },
            { value: "role", label: "Role" },
          ]}
          collapsible={true}
        />

        {/* Table */}
        <div className="min-h-0 flex-1">
          <UserTable users={users} currentUserId={currentUserId} />
        </div>

        {/* Pager */}
        <div className="pt-1">
          <DataPager
            basePath="/admin/users"
            page={q.page}
            per={q.per}
            total={total}
            q={q.q}
            sort={q.sort}
            dir={q.dir}
            params={{
              role: typeof (sp as any).role === "string" ? (sp as any).role : undefined,
              createdFrom: typeof (sp as any).createdFrom === "string" ? (sp as any).createdFrom : undefined,
              createdTo: typeof (sp as any).createdTo === "string" ? (sp as any).createdTo : undefined,
            }}
          />
        </div>
      </div>
    </AdminIndexShell>
  );
}
