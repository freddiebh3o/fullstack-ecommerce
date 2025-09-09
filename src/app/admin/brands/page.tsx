// src/app/admin/brands/page.tsx
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import ForbiddenPage from "@/app/403/page";
import { ensureAnyPagePermission } from "@/lib/auth/guards/page";
import { can } from "@/lib/auth/permissions";
import BrandTable from "@/components/admin/brand-table";

export default async function AdminBrandsPage() {
  // View allowed for read OR write
  const perm = await ensureAnyPagePermission(["brand.read", "brand.write"]);
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;

  const brands = await db.brand.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  const mayWrite = await can("brand.write", tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Brands</h1>
          <p className="text-sm text-muted-foreground">
            {brands.length} item{brands.length === 1 ? "" : "s"}
          </p>
        </div>

        {mayWrite ? (
          <Link
            href="/admin/brands/new"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
          >
            New Brand
          </Link>
        ) : null}
      </div>

      <BrandTable brands={brands} />
    </div>
  );
}
