// src/app/admin/categories/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/page-guard";
import EditCategoryForm from "@/components/admin/edit-category-form";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  // Editing requires write
  const perm = await ensurePagePermission("category.write");
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;
  const { id } = await params;

  const cat = await db.category.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { products: true } } },
  });

  if (!cat) notFound();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Edit Category</h1>
      <p className="text-sm text-muted-foreground">
        Attached products: {cat._count.products}
      </p>
      <EditCategoryForm id={cat.id} initial={{ name: cat.name, slug: cat.slug }} />
    </div>
  );
}
