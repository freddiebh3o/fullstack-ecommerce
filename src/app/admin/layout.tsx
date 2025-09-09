import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminUserMenu from "@/components/admin/admin-user-menu";
import AdminThemeProvider from "@/components/theme/admin-theme-provider";
import ThemeToggle from "@/components/theme/theme-toggle";
import { ToastProvider } from "@/components/ui/toast-provider";
import { db } from "@/lib/db/prisma";
import TenantSwitcher from "@/components/admin/tenant-switcher";
import TenantCookieGuard from "@/components/admin/TenantCookieGuard";
import { getCurrentTenantId } from "@/lib/tenant/resolve";
import { can } from "@/lib/auth/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const sysRole = (session?.user as any)?.role as "USER" | "ADMIN" | "SUPERADMIN" | undefined;
  const isSuper = sysRole === "SUPERADMIN" || sysRole === "ADMIN"; // for /admin/users we usually want ADMIN+SUPERADMIN

  // tenants for switcher
  const tenants = isSuper && sysRole === "SUPERADMIN"
    ? await db.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : (await db.membership.findMany({
        where: { userId: session?.user?.id ?? "" },
        select: { tenantId: true, tenant: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      })).map(m => ({ id: m.tenantId, name: m.tenant.name }));

  const currentTenantId = await getCurrentTenantId();

  // Compute sidebar visibility (tenant-scoped perms) once
  let links = [
    { href: "/admin",          label: "Dashboard",  visible: false },
    { href: "/admin/products", label: "Products",   visible: false },
    { href: "/admin/categories", label: "Categories", visible: false },
    { href: "/admin/brands",   label: "Brands",     visible: false },
    { href: "/admin/members",  label: "Members",    visible: false },
    { href: "/admin/users",    label: "Users",      visible: isSuper }, // system-level
    { href: "/admin/roles",    label: "Roles",      visible: false },
  ];

  if (currentTenantId) {
    const [
      prodRead,  prodWrite,
      catRead,   catWrite,
      brandRead, brandWrite,
      memRead,   memManage,
      roleManage
    ] = await Promise.all([
      can("product.read", currentTenantId),  can("product.write", currentTenantId),
      can("category.read", currentTenantId), can("category.write", currentTenantId),
      can("brand.read", currentTenantId),    can("brand.write", currentTenantId),
      can("member.read", currentTenantId),   can("member.manage", currentTenantId),
      can("role.manage", currentTenantId),
    ]);

    const canSeeProducts   = prodRead || prodWrite;
    const canSeeCategories = catRead  || catWrite;
    const canSeeBrands     = brandRead || brandWrite;
    const canSeeMembers    = memRead || memManage;
    const canSeeRoles      = roleManage;

    // dashboard if they can see *anything* tenant-scoped
    const canSeeDashboard  = canSeeProducts || canSeeCategories || canSeeBrands || canSeeMembers || canSeeRoles;

    links = links.map(l => {
      switch (l.href) {
        case "/admin":            return { ...l, visible: canSeeDashboard };
        case "/admin/products":   return { ...l, visible: canSeeProducts };
        case "/admin/categories": return { ...l, visible: canSeeCategories };
        case "/admin/brands":     return { ...l, visible: canSeeBrands };
        case "/admin/members":    return { ...l, visible: canSeeMembers };
        case "/admin/roles":      return { ...l, visible: canSeeRoles };
        default:                  return l; // users already set by isSuper
      }
    });
  }

  return (
    <AdminThemeProvider>
      <ToastProvider>
        <TenantCookieGuard tenantId={currentTenantId} />
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block border-r bg-card">
            <AdminSidebar links={links} />
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
