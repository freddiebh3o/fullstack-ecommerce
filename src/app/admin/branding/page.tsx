// src/app/admin/branding/page.tsx
import { ensureAnyPagePermission, ensurePagePermission } from "@/lib/auth/guards/page";
import ForbiddenPage from "@/app/403/page";
import { getBrandingForTenant } from "@/lib/branding/get-branding";
import BrandingThemeForm from "@/components/admin/branding-theme-form";
import type { BrandingTheme } from "@/lib/branding/defaults";

export default async function BrandingPage() {
  const perm = await ensureAnyPagePermission(["branding.read","branding.write"]);
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;
  const canWrite = (await ensurePagePermission("branding.write")).allowed;

  const data = await getBrandingForTenant(tenantId);

  const initial: BrandingTheme = data;

  return (
    <div className="space-y-6">
      <BrandingThemeForm
        canWrite={canWrite}
        initial={initial}
      />
    </div>
  );
}
