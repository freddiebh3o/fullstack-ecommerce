// src/components/admin/user-table.tsx
"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  createdAt: Date | string;
};

export default function UserTable({
  users,
  currentUserId,
}: {
  users: Row[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(u: Row) {
    if (!confirm(`Delete ${u.email}?`)) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        alert(`Failed to delete: ${msg}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr className="text-foreground">
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = currentUserId === u.id;
            return (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3 font-medium">{u.email}</td>
                <td className="px-4 py-3">{u.name ?? "—"}</td>
                <td className="px-4 py-3">{u.role === "USER" ? "Customer" : "Admin"}</td>
                <td className="px-4 py-3">{DATE_FMT.format(new Date(u.createdAt))}</td>
                <td className="px-4 py-3 text-right">
                  <a href={`/admin/users/${u.id}/edit`} className="mr-2 underline hover:no-underline">
                    Edit
                  </a>
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={busyId === u.id || isPending || isSelf}
                    className="text-destructive underline hover:no-underline disabled:opacity-50"
                    title={isSelf ? "You cannot delete your own account" : undefined}
                  >
                    {busyId === u.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
