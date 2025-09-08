// src/app/admin/brands/[id]/edit/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/page-guard";
import EditBrandForm from "@/components/admin/edit-brand-form";

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const perm = await ensurePagePermission("brand.write");
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;
  const { id } = await params;

  const brand = await db.brand.findFirst({
    where: { id, tenantId },
  });
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
