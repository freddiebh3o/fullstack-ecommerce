// src/app/admin/roles/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import { db } from "@/lib/db/prisma";
import RolesTable from "@/components/admin/roles-table";
import { can } from "@/lib/auth/permissions";

export default async function RolesPage() {
  // Require manage permission to view
  const perm = await ensurePagePermission("role.manage");
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;

  const roles = await db.role.findMany({
    where: { tenantId },
    orderBy: [{ builtin: "desc" }, { key: "asc" }],
    include: {
      permissions: { select: { permission: { select: { key: true } } } },
      _count: { select: { memberships: true } },
    },
  });

  const rows = roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    builtin: r.builtin,
    description: r.description ?? null,
    permissionKeys: r.permissions.map((p) => p.permission.key),
    members: r._count.memberships,
  }));

  // Already required above, but keep for consistency if you relax the page guard later.
  const mayManage = await can("role.manage", tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        {mayManage ? (
          <a className="underline" href="/admin/roles/new">New role</a>
        ) : null}
      </div>

      {/* pass the boolean down */}
      <RolesTable roles={rows} mayManage={mayManage} />
    </div>
  );
}
