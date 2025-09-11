// src/app/admin/branding/page.tsx
import { ensureAnyPagePermission, ensurePagePermission } from "@/lib/auth/guards/page";
import ForbiddenPage from "@/app/403/page";
import { getTenantBranding } from "@/lib/tenant/branding";
import BrandingThemeForm from "@/components/admin/branding-theme-form";

export default async function BrandingPage() {
  const perm = await ensureAnyPagePermission(["branding.read","branding.write"]);
  if (!perm.allowed) return <ForbiddenPage />;

  const { tenantId } = perm;
  const canWrite = (await ensurePagePermission("branding.write")).allowed;

  const data = await getTenantBranding(tenantId);

  const initial = {
    light: data.light,
    dark: data.dark,
    logoUrl: data.logoUrl ?? null,
  };

  return (
    <div className="space-y-6">
      <BrandingThemeForm
        canWrite={canWrite}
        initial={initial}
      />
    </div>
  );
}
