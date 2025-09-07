// src/app/admin/members/new/page.tsx
import { db } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";
import NewMemberForm from "@/components/admin/new-member-form";

export default async function NewMemberPage() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

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
