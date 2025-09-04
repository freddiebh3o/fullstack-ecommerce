// src/app/admin/users/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import UserTable from "@/components/admin/user-table";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    getServerSession(authOptions),
  ]);

  const currentUserId = (session?.user as any)?.id ?? null;

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
