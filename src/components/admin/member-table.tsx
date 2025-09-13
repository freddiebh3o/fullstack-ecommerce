// src/components/admin/member-table.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/http/apiFetch";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type Member = {
  id: string;
  createdAt?: string | Date;
  user: { id: string; email: string; name: string | null };
  role: { id: string; key: string; name: string };
};
type Role = { id: string; key: string; name: string };

export default function MemberTable({
  members,
  roles,
  mayManage,
}: {
  members: Member[];
  roles: Role[];
  mayManage: boolean;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function changeRole(membershipId: string, roleKey: Role["key"]) {
    if (!mayManage) return;
    setBusy(membershipId);
    try {
      const res = await apiFetch(`/api/admin/members/${membershipId}`, {
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
    if (!mayManage) return;
    if (!confirm("Remove this member from the tenant?")) return;
    setBusy(membershipId);
    try {
      const res = await apiFetch(`/api/admin/members/${membershipId}`, { method: "DELETE" });

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
    <div className="flex min-h-0 flex-1 rounded-xl border bg-card shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No members yet.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => {
                const disabled = !mayManage || busy === m.id;
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.user.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.user.email}</TableCell>
                    <TableCell>
                      <input type="hidden" value={m.role.key} aria-hidden />
                      <Select
                        defaultValue={m.role.key}
                        onValueChange={(v) => mayManage && changeRole(m.id, v as Role["key"])}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-[200px]" aria-label="Change role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.key}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {m.createdAt ? DATE_FMT.format(new Date(m.createdAt)) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => mayManage && remove(m.id)}
                        disabled={disabled}
                        aria-disabled={disabled}
                        aria-busy={busy === m.id}
                        title={
                          mayManage
                            ? busy === m.id
                              ? "Removing…"
                              : "Remove member"
                            : "You don’t have permission to manage members"
                        }
                        aria-label={
                          mayManage
                            ? busy === m.id
                              ? "Removing member"
                              : "Remove member"
                            : "Remove member (no permission)"
                        }
                      >
                        <Trash2 className={`h-4 w-4 ${busy === m.id ? "opacity-50" : ""}`} />
                      </Button>
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
