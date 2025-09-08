// src/app/admin/products/new/page.tsx
import { db } from "@/lib/db";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/page-guard";
import NewProductForm from "@/components/admin/new-product-form";

export default async function NewProductPage() {
  const perm = await ensurePagePermission("product.write");
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;

  const [categories, brands] = await Promise.all([
    db.category.findMany({ where: { tenantId }, select: { name: true, slug: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { tenantId }, select: { name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Product</h1>
      <NewProductForm categories={categories} brands={brands} />
    </div>
  );
}
