// src/app/admin/roles/new/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import { db } from "@/lib/db/prisma";
import RoleForm from "@/components/admin/role-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewRolePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>; // Next 15: this is a Promise
}) {
  const perm = await ensurePagePermission("role.manage");
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;

  // Load catalog of permissions (global in your current Prisma client)
  const allPerms = await db.permission.findMany({
    select: { key: true, name: true },
    orderBy: { key: "asc" },
  });

  // Await searchParams FIRST, then safely read ?source
  const sp = await searchParams;
  const rawSource = sp?.source;
  const sourceId =
    typeof rawSource === "string"
      ? rawSource
      : Array.isArray(rawSource)
      ? rawSource[0]
      : undefined;

  // Defaults for cloning (when ?source=<roleId> is present and found)
  let defaults:
    | {
        name?: string;
        key?: string;
        description?: string | null;
        permissionKeys?: string[];
      }
    | undefined;

  if (sourceId) {
    const src = await db.role.findFirst({
      where: { id: sourceId, tenantId },
      include: {
        permissions: {
          select: { permission: { select: { key: true } } },
        },
      },
    });

    if (src) {
      defaults = {
        name: `${src.name} (copy)`,
        key: "", // leave empty so the form can auto-generate via name blur
        description: src.description ?? null,
        permissionKeys: src.permissions.map((p) => p.permission.key),
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
