// src/app/admin/products/page.tsx
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db/prisma";
import ProductTable from "@/components/admin/product-table";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission } from "@/lib/auth/guards/page";
import { can } from "@/lib/auth/permissions";

export default async function AdminProductsListPage() {
  const perm = await ensureAnyPagePermission(["product.read", "product.write"]);
  if (!perm.allowed) return <ForbiddenPage />;
  const { tenantId } = perm;

  const products = await db.product.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      priceCents: true,
      currency: true,
      stock: true,
      createdAt: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      images: { select: { id: true, url: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  const mayWrite = await can("product.write", tenantId);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        {mayWrite && (
          <Link
            href="/admin/products/new"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            New Product
          </Link>
        )}
      </div>

      <ProductTable
        products={products.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceCents: p.priceCents,
          currency: p.currency,
          stock: p.stock,
          createdAt: p.createdAt,
          category: p.category ? { name: p.category.name } : null,
          brand: p.brand ? { name: p.brand.name } : null,
          images: p.images ?? [],
        }))}
        mayWrite={mayWrite}
      />
    </>
  );
}
