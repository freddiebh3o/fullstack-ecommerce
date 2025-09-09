// src/app/admin/categories/new/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import NewCategoryForm from "@/components/admin/new-category-form";

export default async function NewCategoryPage() {
  // Creating requires write
  const perm = await ensurePagePermission("category.write");
  if (!perm.allowed) return <ForbiddenPage />;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">New Category</h1>
      <NewCategoryForm />
    </div>
  );
}
