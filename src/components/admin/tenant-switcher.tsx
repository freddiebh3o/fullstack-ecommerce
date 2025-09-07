// src/components/admin/tenant-switcher.tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TenantSwitcher({
  tenants,
  currentTenantId,
}: { tenants: { id: string; name: string }[]; currentTenantId?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(currentTenantId);

  async function switchTenant(id: string) {
    setValue(id); // optimistic
    await fetch("/api/admin/tenant/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: id }),
    });
    router.refresh();
  }

  return (
    <select
      className="rounded-md border bg-background px-2 py-1 text-sm"
      value={value}
      onChange={e => switchTenant(e.target.value)}
    >
      {tenants.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}
