// src/lib/db/tenant-db.ts
import { db } from "@/lib/db/prisma";
import { getCurrentTenantId } from "@/lib/tenant/resolve";

/**
 * Canonical helper for all routes.
 * Always returns both the Prisma client and the resolved tenantId.
 */
export async function tenantDb() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("No tenant selected");
  // If you later add Prisma $extends for auto-scoping, swap `db` for the extended client.
  const scoped = db;
  return { db: scoped, tenantId };
}
