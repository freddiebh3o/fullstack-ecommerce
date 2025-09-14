// src/app/admin/brands/[id]/edit/page.tsx
import { tenantDb } from "@/lib/db/tenant-db";
import { notFound } from "next/navigation";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import EditBrandForm from "@/components/admin/edit-brand-form";

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const perm = await ensurePagePermission("brand.write");
  if (!perm.allowed) return <ForbiddenPage />;

  const { id } = await params;
  const { db } = await tenantDb();

  const brand = await db.brand.findFirst({ where: { id } });
  if (!brand) notFound();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Edit Brand</h1>
      <EditBrandForm
        id={brand.id}
        initial={{
          name: brand.name,
          slug: brand.slug,
          description: brand.description ?? "",
          websiteUrl: brand.websiteUrl ?? "",
          logoUrl: brand.logoUrl ?? "",
        }}
      />
    </div>
  );
}
