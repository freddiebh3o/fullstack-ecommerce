// src/components/admin/brand-table.tsx
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

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type Row = {
  id: string;
  name: string | null;
  slug: string;
  logoUrl: string | null;
  createdAt?: string | Date;
  _count: { products: number };
};

export default function BrandTable({
  brands,
  mayWrite,
}: {
  brands: Row[];
  mayWrite: boolean;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(b: Row) {
    if (!mayWrite) return;
    if (!confirm(`Delete "${b.name || "Untitled"}"? This cannot be undone.`)) return;
    setBusyId(b.id);
    try {
      const res = await fetch(`/api/admin/brands/${b.id}`, { method: "DELETE" });

      let msg = "Failed to delete brand.";
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

      startTransition(() => router.refresh());
      toast({ message: "Brand deleted" });
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
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No brands yet.
                </TableCell>
              </TableRow>
            ) : (
              brands.map((b) => {
                const deleting = busyId === b.id || isPending;
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {b.logoUrl ? (
                          // Next/Image is fine too, but <img> keeps it simple and you allow the host
                          <img
                            src={b.logoUrl}
                            alt=""
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : null}
                        <div className="font-medium">{b.name || "Untitled"}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{b.slug}</TableCell>
                    <TableCell>{b._count.products}</TableCell>
                    <TableCell>
                      {b.createdAt ? DATE_FMT.format(new Date(b.createdAt)) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {/* Edit icon button */}
                        {mayWrite ? (
                          <Button
                            asChild
                            size="icon"
                            title="Edit brand"
                            aria-label="Edit brand"
                          >
                            <Link href={`/admin/brands/${b.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            disabled
                            title="You don’t have permission to edit"
                            aria-label="Edit brand (no permission)"
                          >
                            <Pencil className="h-4 w-4 opacity-40" />
                          </Button>
                        )}

                        {/* Delete icon button */}
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => mayWrite && handleDelete(b)}
                          disabled={!mayWrite || deleting}
                          aria-disabled={!mayWrite || deleting}
                          aria-busy={deleting}
                          title={
                            mayWrite
                              ? deleting
                                ? "Deleting…"
                                : "Delete brand"
                              : "You don’t have permission to delete"
                          }
                          aria-label={
                            mayWrite
                              ? deleting
                                ? "Deleting brand"
                                : "Delete brand"
                              : "Delete brand (no permission)"
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
