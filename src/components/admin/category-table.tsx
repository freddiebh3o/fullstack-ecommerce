// src/components/admin/category-table.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "../ui/toast-provider";

type Row = {
  id: string;
  name: string;
  slug: string;
  createdAt: string | Date;
  _count: { products: number };
};

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default function CategoryTable({
  categories,
  mayWrite,               // ✅ new prop
}: {
  categories: Row[];
  mayWrite: boolean;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string, name: string) {
    if (!mayWrite) return; // guard
    if (!confirm(`Delete "${name}"? This will detach products from it.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      let msg = "Failed to delete category.";
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
      toast({ message: "Category deleted" });
      startTransition(() => router.refresh());
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
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
              <td className="px-4 py-3">{c._count.products}</td>
              <td className="px-4 py-3">{DATE_FMT.format(new Date(c.createdAt))}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-2">
                  <a
                    href={mayWrite ? `/admin/categories/${c.id}/edit` : "#"}
                    className={`underline hover:no-underline ${
                      mayWrite ? "" : "pointer-events-none opacity-40"
                    }`}
                    aria-disabled={!mayWrite}
                    title={mayWrite ? "Edit" : "You don’t have permission to edit"}
                  >
                    Edit
                  </a>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    disabled={!mayWrite || busyId === c.id || isPending}
                    className={`text-destructive underline hover:no-underline disabled:opacity-50 ${
                      mayWrite ? "" : "cursor-not-allowed"
                    }`}
                    title={mayWrite ? "Delete" : "You don’t have permission to delete"}
                  >
                    {busyId === c.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                No categories yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
