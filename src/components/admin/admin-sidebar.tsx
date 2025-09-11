// src/components/admin/admin-sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image"; // ⬅️ add
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/misc";

type LinkItem = { href: string; label: string; visible: boolean };

export default function AdminSidebar({ links, logoUrl }: { links: LinkItem[]; logoUrl?: string | null }) {
  const pathname = usePathname();

  return (
    <div className="p-3">
      {/* Tenant logo header */}
      {logoUrl ? (
        <div className="mb-4 flex items-center justify-center border-b pb-3">
          <Image
            src={logoUrl}
            alt="Tenant logo"
            width={120}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>
      ) : null}

      <nav>
        <ul className="space-y-1">
          {links
            .filter(l => l.visible)
            .map(({ href, label }) => {
              const active = pathname === href;
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
            })}
        </ul>
      </nav>
    </div>
  );
}
