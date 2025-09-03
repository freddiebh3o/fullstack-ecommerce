// src/components/admin/product-table.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatPrice(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
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
  images: { id: string; url: string }[];
};

export default function ProductTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        alert(`Failed to delete: ${msg}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Category</th>
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
              <td className="px-4 py-3">
                {formatPrice(p.priceCents / 100, p.currency || "GBP")}
              </td>
              <td className="px-4 py-3">{p.stock ?? 0}</td>
              <td className="px-4 py-3">
                {DATE_FMT.format(new Date(p.createdAt))}
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`/admin/products/${p.id}/edit`}
                  className="mr-2 underline hover:no-underline"
                >
                  Edit
                </a>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  disabled={busyId === p.id || isPending}
                  className="text-red-600 underline hover:no-underline disabled:opacity-50"
                >
                  {busyId === p.id ? "Deleting..." : "Delete"}
                </button>
              </td>
            </tr>
          ))}

          {products.length === 0 && (
            <tr>
              <td className="px-4 py-10 text-center text-muted-foreground" colSpan={6}>
                No products yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
