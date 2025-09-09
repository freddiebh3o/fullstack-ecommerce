// src/components/admin/product-table.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatPrice(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
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
  images: { id: string; url: string }[];
};

export default function ProductTable({
  products,
  mayWrite, // ✅ new prop
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
        try { msg = await res.text(); } catch {}
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
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr className="text-foreground">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium">{p.name}</div>
                <div className="text-muted-foreground">{p.slug}</div>
              </td>
              <td className="px-4 py-3">{p.category?.name ?? "—"}</td>
              <td className="px-4 py-3">{p.brand?.name ?? "—"}</td>
              <td className="px-4 py-3">{formatPrice(p.priceCents / 100, p.currency || "GBP")}</td>
              <td className="px-4 py-3">{p.stock ?? 0}</td>
              <td className="px-4 py-3">{DATE_FMT.format(new Date(p.createdAt))}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-2">
                  <a
                    href={mayWrite ? `/admin/products/${p.id}/edit` : "#"}
                    className={`underline hover:no-underline ${mayWrite ? "" : "pointer-events-none opacity-40"}`}
                    aria-disabled={!mayWrite}
                    title={mayWrite ? "Edit" : "You don’t have permission to edit"}
                  >
                    Edit
                  </a>
                  <button
                    onClick={() => mayWrite && handleDelete(p.id, p.name)}
                    disabled={!mayWrite || busyId === p.id || isPending}
                    className={`text-destructive underline hover:no-underline disabled:opacity-50 ${
                      mayWrite ? "" : "cursor-not-allowed"
                    }`}
                    title={mayWrite ? "Delete" : "You don’t have permission to delete"}
                  >
                    {busyId === p.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {products.length === 0 && (
            <tr>
              <td className="px-4 py-10 text-center text-muted-foreground" colSpan={7}>
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
