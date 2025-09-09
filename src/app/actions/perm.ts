// src/app/actions/perm.ts`
"use server";

import { can } from "@/lib/auth/permissions";
import { getCurrentTenantId } from "@/lib/tenant/resolve";

//Dashboard
export async function canAccessDashboard() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;

  const checks = await Promise.all([
    can("product.read", tenantId),
    can("product.write", tenantId),

    can("category.read", tenantId),
    can("category.write", tenantId),

    can("brand.read", tenantId),
    can("brand.write", tenantId),

    can("member.read", tenantId),
    can("member.manage", tenantId),

    // Roles don’t currently have a separate "read" perm, so gate on manage
    can("role.manage", tenantId),
  ]);

  return checks.some(Boolean);
}

//Products

export async function canReadProducts() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  const [r, w] = await Promise.all([
    can("product.read", tenantId),
    can("product.write", tenantId),
  ]);
  return r || w;
}

export async function canWriteProducts() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("product.write", tenantId);
}

// Back-compat alias (existing code may import this)
export const canWriteProduct = canWriteProducts;

//Categories

export async function canReadCategories() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  const [r, w] = await Promise.all([
    can("category.read", tenantId),
    can("category.write", tenantId),
  ]);
  
  return r || w;
}

export async function canWriteCategories() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("category.write", tenantId);
}

// Back-compat alias
export const canWriteCategory = canWriteCategories;

// Brands

export async function canReadBrands() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  const [r, w] = await Promise.all([
    can("brand.read", tenantId),
    can("brand.write", tenantId),
  ]);
  return r || w;
}

export async function canWriteBrands() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("brand.write", tenantId);
}

// Back-compat alias
export const canWriteBrand = canWriteBrands;

/* ===========================
   Members
   =========================== */

export async function canReadMembers() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  const [r, m] = await Promise.all([
    can("member.read", tenantId),
    can("member.manage", tenantId),
  ]);
  return r || m;
}

export async function canManageMembers() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("member.manage", tenantId);
}

/* ===========================
   Roles
   =========================== */

/**
 * Roles currently only have a "manage" permission,
 * so both read & write UIs gate on `role.manage`.
 * If you later add `role.read`, update these accordingly.
 */
export async function canReadRoles() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("role.manage", tenantId);
}

export async function canManageRoles() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return false;
  return can("role.manage", tenantId);
}
