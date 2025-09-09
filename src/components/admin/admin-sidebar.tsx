"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/misc";
import PermissionGate from "@/components/auth/PermissionGate";
import { canReadMembers } from "@/app/actions/perm";
import { isSystemAdmin } from "@/app/actions/is-system-admin";

const baseLinks = [
  { href: "/admin", label: "Dashboard", guard: null },
  { href: "/admin/products", label: "Products", guard: null },
  { href: "/admin/categories", label: "Categories", guard: null },
  { href: "/admin/brands", label: "Brands", guard: null },
  // Members → needs tenant perm (member.read OR member.manage)
  { href: "/admin/members", label: "Members", guard: canReadMembers },
  // Users → system-level only (ADMIN/SUPERADMIN)
  { href: "/admin/users", label: "Users", guard: isSystemAdmin },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="p-3">
      <ul className="space-y-1">
        {baseLinks.map(({ href, label, guard }) => {
          const active = pathname === href;

          // No guard → always render
          if (!guard) {
            return (
              <li key={href}>
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
              </li>
            );
          }

          // Guarded → wrap with PermissionGate
          return (
            <PermissionGate key={href} check={guard}>
              {(allowed) =>
                allowed ? (
                  <li>
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
                  </li>
                ) : null
              }
            </PermissionGate>
          );
        })}
      </ul>
    </nav>
  );
}
