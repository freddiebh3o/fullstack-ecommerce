// src/app/admin/members/new/page.tsx
import { db } from "@/lib/db";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/page-guard";
import NewMemberForm from "@/components/admin/new-member-form";

export default async function NewMemberPage() {
  const perm = await ensurePagePermission("member.manage");
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;

  const roles = await db.role.findMany({
    where: { tenantId },
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
