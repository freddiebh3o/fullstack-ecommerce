// src/app/admin/products/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import ProductTable from "@/components/admin/product-table";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission } from "@/lib/page-guard";
import { can } from "@/lib/permissions";

export default async function AdminProductsListPage() {
  const perm = await ensureAnyPagePermission(["product.read", "product.write"]);
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;

  const products = await db.product.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  const mayWrite = await can("product.write", tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} item{products.length === 1 ? "" : "s"}
          </p>
        </div>

        {mayWrite ? (
          <Link
            href="/admin/products/new"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
          >
            New Product
          </Link>
        ) : null}
      </div>

      <ProductTable products={products} />
    </div>
  );
}
