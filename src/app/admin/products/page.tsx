// src/app/admin/products/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import ProductTable from "@/components/admin/product-table";

export default async function AdminProductsListPage() {
  const products = await db.product.findMany({
    include: {
      category: true,
      brand: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} item{products.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
        >
          New Product
        </Link>
      </div>

      <ProductTable products={products} />
    </div>
  );
}
