// src/app/admin/users/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import UserTable from "@/components/admin/user-table";
import ForbiddenPage from "@/app/403/page";
import { ensureSystemRole } from "@/lib/system-guard";

export default async function AdminUsersPage() {
  // Only ADMIN / SUPERADMIN may view Users
  const guard = await ensureSystemRole(["ADMIN", "SUPERADMIN"]);
  if (!guard.allowed) return <ForbiddenPage />;

  const [users] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  ]);

  const currentUserId = (guard.session.user as any)?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
        >
          New User
        </Link>
      </div>

      <UserTable users={users} currentUserId={currentUserId} />
    </div>
  );
}
