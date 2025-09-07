// src/app/admin/layout.tsx
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminUserMenu from "@/components/admin/admin-user-menu";
import AdminThemeProvider from "@/components/theme/admin-theme-provider";
import ThemeToggle from "@/components/theme/theme-toggle";
import { ToastProvider } from "@/components/ui/toast-provider";
import { db } from "@/lib/db";
import TenantSwitcher from "@/components/admin/tenant-switcher";
import TenantCookieGuard from "@/components/admin/TenantCookieGuard";
import { getCurrentTenantId } from "@/lib/tenant";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const isSuper = (session?.user as any)?.role === "SUPERADMIN";

  const tenants = isSuper
    ? await db.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : (await db.membership.findMany({
        where: { userId: session?.user?.id ?? "" },
        select: { tenantId: true, tenant: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      })).map(m => ({ id: m.tenantId, name: m.tenant.name }));

  const currentTenantId = await getCurrentTenantId();

  return (
    <AdminThemeProvider>
      <ToastProvider>
        {/* ensure cookie is synced to valid tenant (no-op if already set) */}
        <TenantCookieGuard tenantId={currentTenantId} />
      
        <div 
          data-admin
          className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]"
        >
          <aside className="hidden lg:block border-r bg-card">
            <AdminSidebar />
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
