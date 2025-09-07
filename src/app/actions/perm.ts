// src/app/actions/perm.ts`
"use server";
import { can } from "@/lib/permissions";
import { getCurrentTenantId } from "@/lib/tenant";

export async function canWriteCategory() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("category.write", tenantId);
}
