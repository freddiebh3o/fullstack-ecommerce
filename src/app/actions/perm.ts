// src/app/actions/perm.ts`
"use server";
import { can } from "@/lib/auth/permissions";
import { getCurrentTenantId } from "@/lib/tenant/resolve";

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

export async function canManageMembers() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("member.manage", tenantId);
}

export async function canReadMembers() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  // read access if read OR manage
  const [r, m] = await Promise.all([
    can("member.read", tenantId),
    can("member.manage", tenantId),
  ]);
  return r || m;
}