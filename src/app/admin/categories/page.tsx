// src/app/admin/categories/page.tsx
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import CategoryTable from "@/components/admin/category-table";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission } from "@/lib/auth/guards/page";
import { can } from "@/lib/auth/permissions";

export default async function AdminCategoriesPage() {
  // Allow users with either read or write
  const perm = await ensureAnyPagePermission(["category.read", "category.write"]);
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;

  // Fetch data tenant-scoped
  const categories = await db.category.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  // Check if this user can write (to show/hide "New Category")
  const mayWrite = await can("category.write", tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            {categories.length} item{categories.length === 1 ? "" : "s"}
          </p>
        </div>

        {mayWrite ? (
          <Link
            href="/admin/categories/new"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
          >
            New Category
          </Link>
        ) : null}
      </div>

      <CategoryTable categories={categories} />
    </div>
  );
}
