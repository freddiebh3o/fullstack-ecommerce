// src/app/admin/members/page.tsx
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant";
import MemberTable from "@/components/admin/member-table";
import { can } from "@/lib/permissions";           // <-- add

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  const tenantId = await getCurrentTenantId();

  // If not logged in, show nothing or redirect
  if (!session) return null;
  if (!tenantId) {
    // TODO: redirect to a tenant-picker or show a message
    return null;
  }

  // Require the correct tenant-level permission instead of system role
  const allowed = tenantId ? await can("member.manage", tenantId) : false;
  if (!allowed) {
    // You can render a friendly 403 instead of blank:
    // return <p className="text-muted-foreground">You don’t have access to Members.</p>;
    return null;
  }

  // Now fetch tenant-scoped data
  const [members, roles] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <a className="underline" href="/admin/members/new">Add member</a>
      </div>
      <MemberTable members={members as any} roles={roles as any} />
    </div>
  );
}
