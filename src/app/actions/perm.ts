// src/app/actions/perm.ts`
"use server";
import { can } from "@/lib/permissions";
import { getCurrentTenantId } from "@/lib/tenant";

export async function canWriteCategory() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("category.write", tenantId);
}

export async function canWriteBrand() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("brand.write", tenantId);
}

export async function canWriteProduct() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("product.write", tenantId);
}
