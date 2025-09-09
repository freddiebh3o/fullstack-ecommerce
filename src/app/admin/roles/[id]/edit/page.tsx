// src/app/admin/roles/[id]/edit/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import { db } from "@/lib/db/prisma";
import RoleForm from "@/components/admin/role-form";

type RoleDetail = {
  id: string;
  key: string;
  name: string;
  builtin: boolean;
  description: string | null;
  permissionKeys: string[];
  members: number;
};

async function fetchRole(id: string): Promise<RoleDetail> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/admin/roles/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load role");
  const body = await res.json();
  return body.data as RoleDetail;
}

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const perm = await ensurePagePermission("role.manage");
  if (!perm.allowed) return <ForbiddenPage />;

  const { id } = await params;
  const [role, allPermissions] = await Promise.all([
    fetchRole(id),
    db.permission.findMany({ orderBy: { key: "asc" }, select: { key: true, name: true } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit role</h1>
          <div className="text-muted-foreground text-sm">
            {role.builtin ? "Built-in role" : "Custom role"}
          </div>
        </div>

        {!role.builtin && role.members === 0 && (
          <form
            action={`/api/admin/roles/${role.id}`}
            method="POST"
            onSubmit={(e) => {
              if (!confirm("Delete this role? This cannot be undone.")) e.preventDefault();
            }}
          >
            {/* App Router can't use method=DELETE directly in form; do it via fetch on client instead.
                We'll handle delete in RoleForm to keep consistency. */}
          </form>
        )}
      </div>

      <RoleForm
        mode="edit"
        allPermissions={allPermissions}
        initial={role}
      />
    </div>
  );
}
