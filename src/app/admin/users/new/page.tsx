// src/app/admin/users/new/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensureSystemRole } from "@/lib/system-guard";
import NewUserForm from "@/components/admin/new-user-form";

export default async function NewUserPage() {
  const guard = await ensureSystemRole(["ADMIN", "SUPERADMIN"]);
  if (!guard.allowed) return <ForbiddenPage />;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Create User</h1>
      <NewUserForm />
    </div>
  );
}
