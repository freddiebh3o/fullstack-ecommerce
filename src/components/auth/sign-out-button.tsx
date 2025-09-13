// src/components/auth/sign-out-button.tsx
"use client";

import { signOut } from "next-auth/react";

type Props = { className?: string; children?: React.ReactNode };

export default function SignOutButton({ className, children }: Props) {
  return (
    <button
      className={className}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      {children ?? "Sign out"}
    </button>
  );
}
