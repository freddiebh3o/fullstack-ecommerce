// src/components/admin/tenant-switcher.tsx
"use client";

import * as React from "react";
import { setCurrentTenant } from "@/app/actions/tenant";

type Props = {
  tenants: { id: string; name: string }[];
  currentTenantId?: string | null;
};

export default function TenantSwitcher({ tenants, currentTenantId }: Props) {
  const [value, setValue] = React.useState(currentTenantId ?? tenants[0]?.id ?? "");

  React.useEffect(() => {
    setValue(currentTenantId ?? tenants[0]?.id ?? "");
  }, [currentTenantId, tenants]);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setValue(id);
    try {
      await setCurrentTenant(id);
      // optional: optimistic UI is enough; server revalidation will refresh content
    } catch (e: any) {
      alert(e.message || "Could not switch tenant.");
    }
  }

  if (tenants.length === 0) return null;

  return (
    <select value={value} onChange={onChange} className="border rounded px-2 py-1 bg-background">
      {tenants.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}
