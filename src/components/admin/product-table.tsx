// src/components/admin/product-table.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatPrice(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount
  );
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  stock: number;
  createdAt: string | Date;
  category?: { name: string | null } | null;
  brand?: { name: string | null } | null;
  images?: { id: string; url: string }[];
};

export default function ProductTable({
  products,
  mayWrite,
}: {
  products: ProductRow[];
  mayWrite: boolean;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string, name: string) {
    if (!mayWrite) return;
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });

      let msg = "Failed to delete product.";
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
      toast({ message: "Product deleted" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                No products yet.
              </TableCell>
            </TableRow>
          ) : (
            products.map((p) => {
              const deleting = busyId === p.id || isPending;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-muted-foreground">{p.slug}</div>
                  </TableCell>
                  <TableCell>{p.category?.name ?? "—"}</TableCell>
                  <TableCell>{p.brand?.name ?? "—"}</TableCell>
                  <TableCell>
                    {formatPrice((p.priceCents ?? 0) / 100, p.currency || "GBP")}
                  </TableCell>
                  <TableCell>{p.stock ?? 0}</TableCell>
                  <TableCell>{DATE_FMT.format(new Date(p.createdAt))}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {/* Edit icon button */}
                      {mayWrite ? (
                        <Button
                          asChild
                          size="icon"
                          title="Edit product"
                          aria-label="Edit product"
                        >
                          <Link href={`/admin/products/${p.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          disabled
                          title="You don’t have permission to edit"
                          aria-label="Edit product (no permission)"
                        >
                          <Pencil className="h-4 w-4 opacity-40" />
                        </Button>
                      )}

                      {/* Delete icon button */}
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => mayWrite && handleDelete(p.id, p.name)}
                        disabled={!mayWrite || deleting}
                        aria-disabled={!mayWrite || deleting}
                        aria-busy={deleting}
                        title={mayWrite ? (deleting ? "Deleting…" : "Delete product") : "You don’t have permission to delete"}
                        aria-label={mayWrite ? (deleting ? "Deleting product" : "Delete product") : "Delete product (no permission)"}
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
  );
}
