"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast-provider";

type Row = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count: { products: number };
};

export default function BrandTable({ brands }: { brands: Row[] }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(b: Row) {
    if (!confirm(`Delete "${b.name}"?`)) return;
    setBusyId(b.id);
    try {
      const res = await fetch(`/api/admin/brands/${b.id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
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
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr className="text-foreground">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Products</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium flex items-center gap-2">
                  {b.logoUrl ? (
                    <img
                      src={b.logoUrl}
                      alt=""
                      className="h-6 w-6 rounded object-cover"
                    />
                  ) : null}
                  {b.name}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{b.slug}</td>
              <td className="px-4 py-3">{b._count.products}</td>
              <td className="px-4 py-3">
                <a
                  href={`/admin/brands/${b.id}/edit`}
                  className="underline hover:no-underline mr-3"
                >
                  Edit
                </a>
                <button
                  onClick={() => handleDelete(b)}
                  disabled={busyId === b.id || isPending}
                  className="text-destructive underline hover:no-underline disabled:opacity-50"
                >
                  {busyId === b.id ? "Deleting..." : "Delete"}
                </button>
              </td>
            </tr>
          ))}
          {brands.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                No brands yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
