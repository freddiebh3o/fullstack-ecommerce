import { db } from "@/lib/db";
import NewProductForm from "@/components/admin/new-product-form";
import { getCurrentTenantId } from "@/lib/tenant";

export default async function NewProductPage() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return <div className="text-red-600">No tenant selected.</div>;
  }

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
