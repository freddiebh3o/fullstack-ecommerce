// src/components/admin/brand-table.tsx
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

export default function BrandTable({
  brands,
  mayWrite, // ✅ new prop
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
    if (!confirm(`Delete "${b.name}"?`)) return;
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
                    // keep <img> since you already allow this host in next.config
                    <img src={b.logoUrl} alt="" className="h-6 w-6 rounded object-cover" />
                  ) : null}
                  {b.name}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{b.slug}</td>
              <td className="px-4 py-3">{b._count.products}</td>
              <td className="px-4 py-3">
                <div className="inline-flex items-center gap-2">
                  <a
                    href={mayWrite ? `/admin/brands/${b.id}/edit` : "#"}
                    className={`underline hover:no-underline ${
                      mayWrite ? "" : "pointer-events-none opacity-40"
                    }`}
                    aria-disabled={!mayWrite}
                    title={mayWrite ? "Edit" : "You don’t have permission to edit"}
                  >
                    Edit
                  </a>
                  <button
                    onClick={() => mayWrite && handleDelete(b)}
                    disabled={!mayWrite || busyId === b.id || isPending}
                    className={`text-destructive underline hover:no-underline disabled:opacity-50 ${
                      mayWrite ? "" : "cursor-not-allowed"
                    }`}
                    title={mayWrite ? "Delete" : "You don’t have permission to delete"}
                  >
                    {busyId === b.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
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
