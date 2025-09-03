// src/app/admin/categories/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import CategoryTable from "@/components/admin/category-table";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            {categories.length} item{categories.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
        >
          New Category
        </Link>
      </div>

      <CategoryTable categories={categories} />
    </div>
  );
}
