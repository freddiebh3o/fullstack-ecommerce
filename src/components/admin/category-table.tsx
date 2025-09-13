// src/components/admin/category-table.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { apiFetch } from "@/lib/http/apiFetch";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type CategoryRow = {
  id: string;
  name: string | null;
  slug: string;
  createdAt: string | Date;
  _count: { products: number };
};

export default function CategoryTable({
  categories,
  mayWrite,
}: {
  categories: CategoryRow[];
  mayWrite: boolean;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string, name: string | null) {
    if (!mayWrite) return;
    if (!confirm(`Delete category "${name || "Untitled"}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });

      let msg = "Failed to delete category.";
      try {
        const body = await res.json();
        if (body?.error?.message) msg = body.error.message;
      } catch {
        try {
          msg = await res.text();
        } catch {}
      }

      if (!res.ok) {
        toast({ title: "Delete failed", message: msg, variant: "destructive" });
        return;
      }

      startTransition(() => router.refresh());
      toast({ message: "Category deleted" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 rounded-xl border bg-card shadow-sm overflow-y-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No categories yet.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => {
                const deleting = busyId === c.id || isPending;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name || "Untitled"}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                    <TableCell>{c._count.products}</TableCell>
                    <TableCell>{DATE_FMT.format(new Date(c.createdAt))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {mayWrite ? (
                          <Button
                            asChild
                            size="icon"
                            title="Edit category"
                            aria-label="Edit category"
                          >
                            <Link href={`/admin/categories/${c.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            disabled
                            title="You don't have permission to edit"
                            aria-label="Edit category (no permission)"
                          >
                            <Pencil className="h-4 w-4 opacity-40" />
                          </Button>
                        )}

                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => mayWrite && handleDelete(c.id, c.name)}
                          disabled={!mayWrite || deleting}
                          aria-disabled={!mayWrite || deleting}
                          aria-busy={deleting}
                          title={
                            mayWrite
                              ? deleting
                                ? "Deleting…"
                                : "Delete category"
                              : "You don't have permission to delete"
                          }
                          aria-label={
                            mayWrite
                              ? deleting
                                ? "Deleting category"
                                : "Delete category"
                              : "Delete category (no permission)"
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
