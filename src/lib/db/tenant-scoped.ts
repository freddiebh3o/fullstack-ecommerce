// src/lib/db/tenant-scoped.ts
// Models that *carry* tenantId and must always be scoped by it.
export const TENANT_SCOPED = new Set<string>([
    "Category",
    "Brand",
    "Product",
    "ProductImage",
    "Membership",
    "Role",           // tenant roles (tenantId=null = system template; filtered out by tenant scope)
    "AuditLog",
    "TenantBranding",
    "FeatureOverride",
]);
  
// Intentionally NOT included (no tenantId field):
// - Permission, PermissionAssignment, Plan, Feature, Tenant, User
// These are global/system or linked via relations; handle them via role/guard logic.
  