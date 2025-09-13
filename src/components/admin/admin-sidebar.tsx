// src/components/admin/admin-sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/misc";

type LinkItem = { href: string; label: string; visible: boolean };

export default function AdminSidebar({
  links,
  logoUrl,
}: {
  links: LinkItem[];
  logoUrl?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Container adopts branded sidebar tokens
        "flex min-h-full flex-col",
        "bg-[var(--sidebar)] text-[var(--sidebar-foreground)]",
        "border-r border-[var(--sidebar-border)]"
      )}
      // Keep everything inside the admin scope so variables are present
      data-admin
    >
      <div className="p-3">
        {/* Tenant logo header */}
        {logoUrl ? (
          <div
            className={cn(
              "mb-4 flex items-center justify-center pb-3",
              "border-b border-[var(--sidebar-border)]"
            )}
          >
            <Image
              src={logoUrl}
              alt="Tenant logo"
              width={120}
              height={40}
              className="h-10 w-auto object-contain dark:invert"
              priority
            />
          </div>
        ) : null}

        <nav>
          <ul className="space-y-1">
            {links
              .filter((l) => l.visible)
              .map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        // Base item
                        "group flex items-center rounded-md px-3 py-2 text-sm outline-none transition-colors",
                        // Use toned foreground for idle state
                        "text-[color-mix(in_oklab,var(--sidebar-foreground),transparent_20%)]",

                        // Hover uses the *accent* tokens
                        "hover:bg-[var(--primary-hover)] hover:text-[var(--header-title)]",

                        // Focus ring uses sidebar ring token
                        "focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--sidebar-ring),transparent_50%)] focus-visible:border-[var(--sidebar-ring)]",

                        // Active (current page) uses the *primary* tokens
                        active &&
                          "bg-[var(--sidebar-primary)] text-[var(--header-title)] font-medium"
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
