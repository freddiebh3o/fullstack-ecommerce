// src/app/admin/brands/new/page.tsx
import ForbiddenPage from "@/app/403/page";
import { ensurePagePermission } from "@/lib/auth/guards/page";
import NewBrandForm from "@/components/admin/new-brand-form";

export default async function NewBrandPage() {
  const perm = await ensurePagePermission("brand.write");
  if (!perm.allowed) return <ForbiddenPage />;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold">New Brand</h1>
      <NewBrandForm />
    </div>
  );
}