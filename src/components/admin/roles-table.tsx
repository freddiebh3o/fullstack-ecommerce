"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast-provider";
import PermissionGate from "@/components/auth/PermissionGate";
import { canManageRoles } from "@/app/actions/perm";

type Row = {
  id: string;
  key: string;
  name: string;
  builtin: boolean;
  description: string | null;
  permissionKeys: string[];
  members: number;
};

export default function RolesTable({ roles }: { roles: Row[] }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete role "${name}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
      let msg = "Failed to delete role.";
      try {
        const body = await res.json();
        if (body?.error?.message) msg = body.error.message;
      } catch {
        try { msg = await res.text(); } catch {}
      }
      if (!res.ok) {
        toast({ title: "Delete failed", message: msg, variant: "destructive" });
        return;
      }
      toast({ message: "Role deleted" });
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Key</th>
            <th className="px-4 py-3">Permissions</th>
            <th className="px-4 py-3">Members</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => {
            const deleteDisabled = r.builtin || r.members > 0;
            return (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.builtin && (
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        built-in
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <div className="text-muted-foreground text-xs">{r.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.key}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.permissionKeys.map((k) => (
                      <span key={k} className="rounded border px-1.5 py-0.5 text-[11px]">
                        {k}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{r.members}</td>
                <td className="px-4 py-3 text-right">
                  <PermissionGate check={canManageRoles}>
                    {(allowed) => (
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={allowed ? `/admin/roles/${r.id}/edit` : "#"}
                          className={`underline hover:no-underline ${
                            allowed ? "" : "pointer-events-none opacity-40"
                          }`}
                          aria-disabled={!allowed}
                          title={allowed ? "Edit" : "You don’t have permission to edit"}
                        >
                          Edit
                        </a>
                        <button
                          onClick={() => allowed && !deleteDisabled && handleDelete(r.id, r.name)}
                          disabled={!allowed || deleteDisabled || busyId === r.id || isPending}
                          className={`text-destructive underline hover:no-underline disabled:opacity-50 ${
                            allowed && !deleteDisabled ? "" : "cursor-not-allowed"
                          }`}
                          title={
                            !allowed
                              ? "You don’t have permission to delete"
                              : deleteDisabled
                              ? r.builtin
                                ? "Built-in roles cannot be deleted"
                                : "Role has assigned members and cannot be deleted"
                              : "Delete"
                          }
                        >
                          {busyId === r.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </PermissionGate>
                </td>
              </tr>
            );
          })}
          {roles.length === 0 && (
            <tr>
              <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                No roles yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
