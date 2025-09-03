// src/components/admin/admin-user-menu.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AdminUserMenu({ email }: { email?: string }) {
  return (
    <div className="flex items-center gap-3">
      {email ? (
        <span className="hidden sm:inline text-sm text-muted-foreground">{email}</span>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-md"
      >
        Sign out
      </Button>
    </div>
  );
}
