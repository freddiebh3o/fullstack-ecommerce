"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/misc";
import PermissionGate from "@/components/auth/PermissionGate";
import { canReadMembers, canManageRoles, canReadProducts, canAccessDashboard, canReadCategories, canReadBrands } from "@/app/actions/perm";
import { isSystemAdmin } from "@/app/actions/is-system-admin";

const baseLinks = [
  { href: "/admin", label: "Dashboard", guard: canAccessDashboard },
  { href: "/admin/products", label: "Products", guard: canReadProducts },
  { href: "/admin/categories", label: "Categories", guard: canReadCategories },
  { href: "/admin/brands", label: "Brands", guard: canReadBrands },
  { href: "/admin/members", label: "Members", guard: canReadMembers },
  { href: "/admin/users", label: "Users", guard: isSystemAdmin },
  // If you added it earlier:
  { href: "/admin/roles", label: "Roles", guard: canManageRoles }, // or your chosen guard
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="p-3">
      <ul className="space-y-1">
        {baseLinks.map(({ href, label, guard }) => {
          const active = pathname === href;
          const linkEl = (
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm outline-none",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active && "bg-accent text-accent-foreground font-medium"
              )}
            >
              {label}
            </Link>
          );

          // Always make the <li> the keyed list child
          if (!guard) {
            return <li key={href}>{linkEl}</li>;
          }

          return (
            <li key={href}>
              <PermissionGate check={guard}>
                {(allowed) => (allowed ? linkEl : null)}
              </PermissionGate>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
