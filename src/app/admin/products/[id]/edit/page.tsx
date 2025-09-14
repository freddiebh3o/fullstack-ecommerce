// src/app/admin/products/[id]/edit/page.tsx
import { tenantDb } from "@/lib/db/tenant-db";
import { notFound } from "next/navigation";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import EditProductForm from "@/components/admin/edit-product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const perm = await ensurePagePermission("product.write");
  if (!perm.allowed) return <ForbiddenPage />;

  const { id } = await params;
  const { db } = await tenantDb();

  const [product, categories, brands] = await Promise.all([
    db.product.findFirst({
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
        categories={categories}
        brands={brands}
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
