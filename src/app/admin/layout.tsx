// src/app/admin/layout.tsx
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminUserMenu from "@/components/admin/admin-user-menu";
import AdminThemeProvider from "@/components/theme/admin-theme-provider";
import ThemeToggle from "@/components/theme/theme-toggle";
import { ToastProvider } from "@/components/ui/toast-provider";
import { db as systemDb } from "@/lib/db/prisma";
import TenantSwitcher from "@/components/admin/tenant-switcher";
import TenantCookieGuard from "@/components/admin/tenant-cookie-guard";
import { getCurrentTenantId } from "@/lib/tenant/resolve";
import { can } from "@/lib/auth/permissions";
import { getBrandingForTenant } from "@/lib/branding/get-branding";
import { themeToScopedCss } from "@/lib/branding/css-vars";
import { getCspNonce } from "@/lib/security/get-csp-nonce";


export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const sysRole = (session?.user as any)?.role as "USER" | "ADMIN" | "SUPERADMIN" | undefined;
  const isSuper = sysRole === "SUPERADMIN" || sysRole === "ADMIN";

  const tenants =
    isSuper && sysRole === "SUPERADMIN"
      ? await systemDb.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : (
          await systemDb.membership.findMany({
            where: { userId: session?.user?.id ?? "" },
            select: { tenantId: true, tenant: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          })
        ).map((m) => ({ id: m.tenantId, name: m.tenant.name }));

  const currentTenantId = await getCurrentTenantId();

  let links = [
    { href: "/admin", label: "Dashboard", visible: false },
    { href: "/admin/products", label: "Products", visible: false },
    { href: "/admin/categories", label: "Categories", visible: false },
    { href: "/admin/brands", label: "Brands", visible: false },
    { href: "/admin/members", label: "Members", visible: false },
    { href: "/admin/users", label: "Users", visible: isSuper },
    { href: "/admin/roles", label: "Roles", visible: false },
    { href: "/admin/branding", label: "Branding", visible: false },
  ];

  if (currentTenantId) {
    const [
      prodRead, prodWrite, catRead, catWrite, brandRead, brandWrite,
      memRead, memManage, roleManage, brandingRead, brandingWrite,
    ] = await Promise.all([
      can("product.read", currentTenantId),
      can("product.write", currentTenantId),
      can("category.read", currentTenantId),
      can("category.write", currentTenantId),
      can("brand.read", currentTenantId),
      can("brand.write", currentTenantId),
      can("member.read", currentTenantId),
      can("member.manage", currentTenantId),
      can("role.manage", currentTenantId),
      can("branding.read", currentTenantId),
      can("branding.write", currentTenantId),
    ]);

    const canSeeProducts = prodRead || prodWrite;
    const canSeeCategories = catRead || catWrite;
    const canSeeBrands = brandRead || brandWrite;
    const canSeeMembers = memRead || memManage;
    const canSeeRoles = roleManage;
    const canSeeBranding = brandingRead || brandingWrite;

    const canSeeDashboard =
      canSeeProducts || canSeeCategories || canSeeBrands || canSeeMembers || canSeeRoles || canSeeBranding;

    links = links.map((l) => {
      switch (l.href) {
        case "/admin": return { ...l, visible: canSeeDashboard };
        case "/admin/products": return { ...l, visible: canSeeProducts };
        case "/admin/categories": return { ...l, visible: canSeeCategories };
        case "/admin/brands": return { ...l, visible: canSeeBrands };
        case "/admin/members": return { ...l, visible: canSeeMembers };
        case "/admin/roles": return { ...l, visible: canSeeRoles };
        case "/admin/branding": return { ...l, visible: canSeeBranding };
        default: return l;
      }
    });
  }

  // ✨ Load tenant branding and build CSS
  const branding = currentTenantId ? await getBrandingForTenant(currentTenantId) : null;
  const brandingCss = branding ? themeToScopedCss(branding) : "";
  const nonce = await getCspNonce();
  const sidebarLogoUrl = branding?.logoUrl ?? null;

  return (
    <AdminThemeProvider nonce={nonce ?? undefined}>
      <ToastProvider>
        <TenantCookieGuard tenantId={currentTenantId} />

        {brandingCss ? (
          <style
            id="tenant-branding-vars"
            dangerouslySetInnerHTML={{ __html: brandingCss }}
          />
        ) : null}

        <div data-admin className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block border-r bg-card">
            <AdminSidebar links={links} logoUrl={sidebarLogoUrl} />
          </aside>

          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
              <div className="flex h-14 items-center justify-between px-4">
                <div className="font-semibold">Admin</div>
                <div className="flex items-center gap-2">
                  <TenantSwitcher tenants={tenants} currentTenantId={currentTenantId} />
                  <ThemeToggle />
                  <AdminUserMenu email={session?.user?.email ?? ""} />
                </div>
              </div>
            </header>

            <main className="p-6">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </AdminThemeProvider>
  );
}
