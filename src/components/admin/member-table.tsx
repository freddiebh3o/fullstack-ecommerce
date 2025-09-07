// src/components/admin/member-table.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";

type Member = {
  id: string;
  user: { id: string; email: string; name: string | null };
  role: { id: string; key: "OWNER" | "ADMIN" | "EDITOR" | "READONLY"; name: string };
  // createdAt?: string;
};
type Role = { id: string; key: "OWNER" | "ADMIN" | "EDITOR" | "READONLY"; name: string };

export default function MemberTable({ members, roles }: { members: Member[]; roles: Role[] }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function changeRole(membershipId: string, roleKey: Role["key"]) {
    setBusy(membershipId);
    const res = await fetch(`/api/admin/members/${membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleKey }),
    });
    setBusy(null);
    if (!res.ok) {
      toast({ title: "Failed", message: await res.text(), variant: "destructive" });
      return;
    }
    toast({ message: "Role updated" });
    router.refresh();
  }

  async function remove(membershipId: string) {
    if (!confirm("Remove this member from the tenant?")) return;
    setBusy(membershipId);
    const res = await fetch(`/api/admin/members/${membershipId}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      toast({ title: "Failed", message: await res.text(), variant: "destructive" });
      return;
    }
    toast({ message: "Member removed" });
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="px-4 py-3">{m.user.name ?? "—"}</td>
              <td className="px-4 py-3">{m.user.email}</td>
              <td className="px-4 py-3">
                <select
                  className="rounded-md border bg-background px-2 py-1"
                  value={m.role.key}
                  onChange={(e) => changeRole(m.id, e.target.value as Role["key"])}
                  disabled={busy === m.id}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.key}>{r.name}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => remove(m.id)}
                  className="text-destructive underline hover:no-underline disabled:opacity-50"
                  disabled={busy === m.id}
                >
                  {busy === m.id ? "Removing..." : "Remove"}
                </button>
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                No members yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
