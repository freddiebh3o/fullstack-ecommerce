// src/components/admin/user-table.tsx
"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { apiFetch } from "@/lib/api/client";

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
  role: "USER" | "SUPERUSER";
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
  const { push: toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(u: Row) {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    setBusyId(u.id);
    try {
      await apiFetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      startTransition(() => router.refresh());
      toast({ message: "User deleted" });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        message: e?.message ?? "Failed to delete user.",
        variant: "destructive",
      });
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
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = currentUserId === u.id;
                const deleting = busyId === u.id || isPending;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.name ?? "—"}</TableCell>
                    <TableCell>
                    {u.role === "USER" ? "Customer" : "Superuser"}
                    </TableCell>
                    <TableCell>{DATE_FMT.format(new Date(u.createdAt))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          asChild
                          size="icon"
                          title="Edit user"
                          aria-label="Edit user"
                        >
                          <Link href={`/admin/users/${u.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(u)}
                          disabled={deleting || isSelf}
                          aria-disabled={deleting || isSelf}
                          aria-busy={deleting}
                          title={
                            isSelf
                              ? "You cannot delete your own account"
                              : deleting
                                ? "Deleting…"
                                : "Delete user"
                          }
                          aria-label={
                            isSelf
                              ? "Delete user (not allowed on self)"
                              : deleting
                                ? "Deleting user"
                                : "Delete user"
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
