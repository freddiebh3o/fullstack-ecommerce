// src/components/admin/TenantCookieGuard.tsx
"use client";

import { useEffect } from "react";
import { ensureTenantCookie } from "@/app/actions/tenant";

export default function TenantCookieGuard({ tenantId }: { tenantId: string | null }) {
  useEffect(() => {
    if (!tenantId) return;
    ensureTenantCookie(tenantId).catch(() => {
      // swallow; worst case the page still works because we use validated tenantId server-side
    });
  }, [tenantId]);

  return null;
}
