// src/components/admin/admin-user-menu.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";

export default function AdminUserMenu({ email }: { email?: string }) {
  const doSignOut = useCallback(() => {
    // Always land on /login after sign-out
    signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <span className="hidden sm:inline text-sm text-muted-foreground">{email}</span>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onClick={doSignOut}
        className="rounded-md"
      >
        Sign out
      </Button>
    </div>
  );
}
