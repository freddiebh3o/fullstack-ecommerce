// src/app/admin/members/page.tsx
import { db } from "@/lib/db/prisma";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission, ensurePagePermission } from "@/lib/auth/guards/page";
import MemberTable from "@/components/admin/member-table";

export default async function MembersPage() {
  // Allow read OR manage to view the page
  const perm = await ensureAnyPagePermission(["member.read", "member.manage"]);
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;

  const [members, roles, mayManage] = await Promise.all([
    db.membership.findMany({
      where: { tenantId },
      select: {
        id: true,
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, key: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.role.findMany({
      where: { tenantId },
      select: { id: true, key: true, name: true },
      orderBy: { key: "asc" },
    }),
    (async () => (await ensurePagePermission("member.manage")).allowed)(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        {mayManage ? <a className="underline" href="/admin/members/new">Add member</a> : null}
      </div>

      <MemberTable members={members as any} roles={roles as any} />
    </div>
  );
}
