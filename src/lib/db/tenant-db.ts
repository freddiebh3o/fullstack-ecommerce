// src/lib/db/tenant-db.ts
import { __rawDb } from "@/lib/db/prisma";
import { requireTenantId } from "@/lib/tenant/resolve";
import { prismaForTenant } from "./tenant-extends";

/**
 * Canonical helper for all tenant-scoped routes/pages.
 * Returns an extended Prisma client that enforces tenant isolation.
 */
export async function tenantDb() {
  const tenantId = await requireTenantId();
  const scoped = prismaForTenant(__rawDb, tenantId);
  return { db: scoped, tenantId };
}
