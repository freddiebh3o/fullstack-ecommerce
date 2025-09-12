// src/components/admin/roles-table.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Copy, Pencil, Trash2 } from "lucide-react";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type Row = {
  id: string;
  key: string;
  name: string;
  builtin: boolean;
  description: string | null;
  permissionKeys: string[];
  members: number;
};

export default function RolesTable({
  roles,
  mayManage,
}: {
  roles: Row[];
  mayManage: boolean;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string, name: string) {
    if (!mayManage) return;
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
    <div className="flex min-h-0 flex-1 rounded-xl border bg-card shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No roles yet.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((r) => {
                const deleteBlocked = r.builtin || r.members > 0;
                const deleting = busyId === r.id || isPending;

                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        {r.builtin && (
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                            built-in
                          </span>
                        )}
                      </div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground">{r.description}</div>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs">{r.key}</TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.permissionKeys.map((k) => (
                          <span key={k} className="rounded border px-1.5 py-0.5 text-[11px]">
                            {k}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>{r.members}</TableCell>


                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {/* Clone */}
                        <Button
                          asChild
                          size="icon"
                          title="Clone role"
                          aria-label="Clone role"
                        >
                          <Link href={`/admin/roles/new?source=${r.id}`}>
                            <Copy className="h-4 w-4" />
                          </Link>
                        </Button>

                        {/* Edit */}
                        {mayManage ? (
                          <Button
                            asChild
                            size="icon"
                            title="Edit role"
                            aria-label="Edit role"
                          >
                            <Link href={`/admin/roles/${r.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            disabled
                            title="You don’t have permission to edit"
                            aria-label="Edit role (no permission)"
                          >
                            <Pencil className="h-4 w-4 opacity-40" />
                          </Button>
                        )}

                        {/* Delete */}
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => mayManage && !deleteBlocked && handleDelete(r.id, r.name)}
                          disabled={!mayManage || deleteBlocked || deleting}
                          aria-disabled={!mayManage || deleteBlocked || deleting}
                          aria-busy={deleting}
                          title={
                            !mayManage
                              ? "You don’t have permission to delete"
                              : deleteBlocked
                                ? r.builtin
                                  ? "Built-in roles cannot be deleted"
                                  : "Role has assigned members and cannot be deleted"
                                : deleting
                                  ? "Deleting…"
                                  : "Delete role"
                          }
                          aria-label={
                            !mayManage
                              ? "Delete role (no permission)"
                              : deleteBlocked
                                ? "Delete role (blocked)"
                                : deleting
                                  ? "Deleting role"
                                  : "Delete role"
                          }
                        >
                          <Trash2 className={`h-4 w-4 ${deleting ? "opacity-50" : ""}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
