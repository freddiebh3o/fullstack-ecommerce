// src/app/admin/layout.tsx
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminUserMenu from "@/components/admin/admin-user-menu";
import AdminThemeProvider from "@/components/theme/admin-theme-provider";
import ThemeToggle from "@/components/theme/theme-toggle";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <AdminThemeProvider>
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
              <ThemeToggle />

              <div className="flex items-center gap-2">
                <AdminUserMenu email={session?.user?.email ?? ""} />
              </div>
            </div>
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </AdminThemeProvider>
  );
}
