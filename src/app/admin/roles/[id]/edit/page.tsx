// src/app/admin/roles/[id]/edit/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import { db } from "@/lib/db/prisma";
import RoleForm from "@/components/admin/role-form";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const perm = await ensurePagePermission("role.manage");
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;
  const { id } = await params;

  // Load the role tenant-scoped
  const role = await db.role.findFirst({
    where: { id, tenantId },
    include: {
      permissions: { select: { permission: { select: { key: true } } } },
      _count: { select: { memberships: true } },
    },
  });

  if (!role) {
    // You can throw a notFound() here if you prefer a 404 page
    return <ForbiddenPage />; // or notFound();
  }

  // Load global permission catalog for the checklist
  const allPermissions = await db.permission.findMany({
    select: { key: true, name: true },
    orderBy: { key: "asc" },
  });

  const initial = {
    id: role.id,
    key: role.key,
    name: role.name,
    builtin: role.builtin,
    description: role.description ?? null,
    permissionKeys: role.permissions.map((p) => p.permission.key),
    members: role._count.memberships,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Edit Role</h1>
      <RoleForm
        mode="edit"
        allPermissions={allPermissions}
        initial={initial}
      />
    </div>
  );
}
