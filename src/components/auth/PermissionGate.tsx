// src/components/auth/PermissionGate.tsx
"use client";
import { useEffect, useState } from "react";

type Props = {
  check: () => Promise<boolean>; // server action or API
  children: (allowed: boolean) => React.ReactNode;
};

export default function PermissionGate({ check, children }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { check().then(setAllowed).catch(() => setAllowed(false)); }, [check]);
  if (allowed === null) return null; // or skeleton
  return <>{children(allowed)}</>;
}
