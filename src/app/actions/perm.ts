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

export async function canSeeMembers() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  // Show "Members" if they have read OR manage permission
  const [r, m] = await Promise.all([
    can("member.read", tenantId),
    can("member.manage", tenantId),
  ]);
  return r || m;
}
