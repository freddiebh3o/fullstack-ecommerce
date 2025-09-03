// src/app/admin/products/new/page.tsx
import { db } from "@/lib/db";
import NewProductForm from "@/components/admin/new-product-form";

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    select: { name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Product</h1>
      <NewProductForm categories={categories} />
    </div>
  );
}
