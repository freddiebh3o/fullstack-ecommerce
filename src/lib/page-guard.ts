// src/lib/page-guard.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCurrentTenantId } from "@/lib/tenant";

export async function ensurePagePermission(permissionKey: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { allowed: false as const, reason: "unauthorized" as const };

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { allowed: false as const, reason: "no-tenant" as const };

  const allowed = await can(permissionKey, tenantId);
  if (!allowed) return { allowed: false as const, reason: "forbidden" as const };

  return { allowed: true as const, tenantId };
}

export async function ensureAnyPagePermission(permissionKeys: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) return { allowed: false as const, reason: "unauthorized" as const };

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { allowed: false as const, reason: "no-tenant" as const };

  for (const key of permissionKeys) {
    if (await can(key, tenantId)) return { allowed: true as const, tenantId };
  }
  return { allowed: false as const, reason: "forbidden" as const };
}
