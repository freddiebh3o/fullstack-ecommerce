// src/app/admin/roles/new/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import { db } from "@/lib/db/prisma";
import RoleForm from "@/components/admin/role-form";

export default async function NewRolePage({
  searchParams,
}: { searchParams?: { source?: string } }) {
  const perm = await ensurePagePermission("role.manage");
  if (!perm.allowed) return <ForbiddenPage />;

  const permissions = await db.permission.findMany({
    orderBy: { key: "asc" },
    select: { key: true, name: true },
  });

  const { tenantId } = perm;

  // Load catalog of all permissions (for the checkbox list)
  const allPerms = await db.permission.findMany({
    select: { id: true, key: true, name: true },
    orderBy: { key: "asc" },
  });

  let defaults:
    | { name?: string; key?: string; description?: string | null; permissionKeys?: string[] }
    | undefined;

  if (searchParams?.source) {
    const src = await db.role.findFirst({
      where: { id: searchParams.source, tenantId },
      include: { permissions: { select: { permission: { select: { key: true } } } } },
    });

    if (src) {
      defaults = {
        name: `${src.name} (copy)`,
        key: "",
        description: src.description ?? null,
        permissionKeys: src.permissions.map(p => p.permission.key),
      };
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New role</h1>
      <RoleForm
        mode="create"
        allPermissions={allPerms}
        initial={null}
        defaults={defaults}
      />

    </div>
  );
}
