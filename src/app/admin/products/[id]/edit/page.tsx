// src/app/admin/products/[id]/edit/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EditProductForm from "@/components/admin/edit-product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories, brands] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { category: true, brand: true, images: { orderBy: { sortOrder: "asc" } } },
    }),
    db.category.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ select: { name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Product</h1>
      <EditProductForm
        id={product.id}
        categories={categories}     // now: {name, slug}[]
        brands={brands}             // now: {name, slug}[]
        initial={{
          name: product.name,
          slug: product.slug,
          priceCents: product.priceCents,
          currency: product.currency,
          description: product.description ?? "",
          imageUrl: product.images[0]?.url ?? "",
          categorySlug: product.category?.slug ?? "",
          brandSlug: product.brand?.slug ?? "",
        }}
      />
    </div>
  );
}
