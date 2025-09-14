// src/app/admin/products/new/page.tsx
import { tenantDb } from "@/lib/db/tenant-db";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import NewProductForm from "@/components/admin/new-product-form";

export default async function NewProductPage() {
  const perm = await ensurePagePermission("product.write");
  if (!perm.allowed) return <ForbiddenPage />;

  const { db } = await tenantDb();

  const [categories, brands] = await Promise.all([
    db.category.findMany({select: { name: true, slug: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({select: { name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Product</h1>
      <NewProductForm categories={categories} brands={brands} />
    </div>
  );
}
