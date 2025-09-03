import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EditProductForm from "@/components/admin/edit-product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Product</h1>
      <EditProductForm
        id={product.id}
        initial={{
          name: product.name,
          slug: product.slug,
          priceCents: product.priceCents,
          currency: product.currency,
          description: product.description ?? "",
          imageUrl: product.images[0]?.url ?? "",
          categorySlug: product.category?.slug ?? "",
        }}
      />
    </div>
  );
}
