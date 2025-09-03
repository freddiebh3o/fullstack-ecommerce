// src/app/admin/categories/[id]/edit/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EditCategoryForm from "@/components/admin/edit-category-form";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!cat) notFound();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Edit Category</h1>
      <p className="text-sm text-muted-foreground">Attached products: {cat._count.products}</p>
      <EditCategoryForm id={cat.id} initial={{ name: cat.name, slug: cat.slug }} />
    </div>
  );
}
