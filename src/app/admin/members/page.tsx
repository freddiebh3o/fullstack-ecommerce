// src/app/admin/members/page.tsx
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant";
import MemberTable from "@/components/admin/member-table";

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  const tenantId = await getCurrentTenantId();

  const sysRole = (session?.user as any)?.role as "ADMIN" | "USER" | "SUPERADMIN" | undefined;
  const isAdminOrSuper = sysRole === "ADMIN" || sysRole === "SUPERADMIN";
  if (!isAdminOrSuper) {
    // not allowed to view admin area
    return null;
  }

  if (!tenantId) {
    // SUPERADMIN with no tenant selected yet (or no membership/default tenant set)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Members</h1>
        </div>
        <p className="text-muted-foreground">
          No tenant selected. Use the tenant switcher in the header to choose a tenant.
        </p>
      </div>
    );
  }

  const [members, roles] = await Promise.all([
    db.membership.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, key: true, name: true } },
      },
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
