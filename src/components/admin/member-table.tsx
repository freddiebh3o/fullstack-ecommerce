// src/components/admin/member-table.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import PermissionGate from "@/components/auth/PermissionGate";
import { canManageMembers } from "@/app/actions/perm";

type Member = {
  id: string;
  user: { id: string; email: string; name: string | null };
  role: { id: string; key: string; name: string };
};
type Role = { id: string; key: string; name: string };

export default function MemberTable({ members, roles }: { members: Member[]; roles: Role[] }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function changeRole(membershipId: string, roleKey: Role["key"]) {
    setBusy(membershipId);
    try {
      const res = await fetch(`/api/admin/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleKey }),
      });
      let msg = "Failed to update role.";
      try {
        const body = await res.json();
        if (body?.error?.message) msg = body.error.message;
      } catch {
        try { msg = await res.text(); } catch {}
      }
      if (!res.ok) {
        toast({ title: "Failed", message: msg, variant: "destructive" });
        return;
      }
      toast({ message: "Role updated" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(membershipId: string) {
    if (!confirm("Remove this member from the tenant?")) return;
    setBusy(membershipId);
    try {
      const res = await fetch(`/api/admin/members/${membershipId}`, { method: "DELETE" });
      let msg = "Failed to remove member.";
      try {
        const body = await res.json();
        if (body?.error?.message) msg = body.error.message;
      } catch {
        try { msg = await res.text(); } catch {}
      }
      if (!res.ok) {
        toast({ title: "Failed", message: msg, variant: "destructive" });
        return;
      }
      toast({ message: "Member removed" });
      router.refresh();
    } finally {
      setBusy(null);
    }
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
                <PermissionGate check={canManageMembers}>
                  {(allowed) => (
                    <select
                      className="rounded-md border bg-background px-2 py-1"
                      value={m.role.key}
                      onChange={(e) => allowed && changeRole(m.id, e.target.value as Role["key"])}
                      disabled={!allowed || busy === m.id}
                      title={allowed ? "Change role" : "You don’t have permission to manage members"}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.key}>{r.name}</option>
                      ))}
                    </select>
                  )}
                </PermissionGate>
              </td>
              <td className="px-4 py-3 text-right">
                <PermissionGate check={canManageMembers}>
                  {(allowed) => (
                    <button
                      onClick={() => allowed && remove(m.id)}
                      className="text-destructive underline hover:no-underline disabled:opacity-50"
                      disabled={!allowed || busy === m.id}
                      title={allowed ? "Remove member" : "You don’t have permission to manage members"}
                    >
                      {busy === m.id ? "Removing..." : "Remove"}
                    </button>
                  )}
                </PermissionGate>
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
