// src/app/admin/roles/new/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import { db } from "@/lib/db/prisma";
import RoleForm from "@/components/admin/role-form";

export default async function NewRolePage() {
  const perm = await ensurePagePermission("role.manage");
  if (!perm.allowed) return <ForbiddenPage />;

  const permissions = await db.permission.findMany({
    orderBy: { key: "asc" },
    select: { key: true, name: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New role</h1>
      <RoleForm
        mode="create"
        allPermissions={permissions}
        initial={null}
      />
    </div>
  );
}
