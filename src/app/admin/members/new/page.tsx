// src/app/admin/members/new/page.tsx
import { tenantDb } from "@/lib/db/tenant-db";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import NewMemberForm from "@/components/admin/new-member-form";
export default async function NewMemberPage() {
  const perm = await ensurePagePermission("member.manage");
  if (!perm.allowed) return <ForbiddenPage />;

  const { db } = await tenantDb();

  const roles = await db.role.findMany({
    select: { key: true, name: true },
    orderBy: { key: "asc" },
  });

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Add Member</h1>
      <NewMemberForm roles={roles} />
    </div>
  );
}
