// app/admin/layout.tsx
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminUserMenu from "@/components/admin/admin-user-menu";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block border-r bg-card">
        <AdminSidebar />
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="font-semibold">Admin</div>
            <AdminUserMenu email={session?.user?.email ?? ""} />
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
