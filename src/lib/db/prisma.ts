// src/lib/db/prisma.ts
import { PrismaClient } from "@prisma/client";
import { TENANT_SCOPED } from "./tenant-scoped";

// Cache the underlying Prisma connection in dev to avoid hot-reload leaks
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prismaBase =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaBase;
}

/** Enforcement mode:
 *  - "off":   no guard (not recommended)
 *  - "warn":  log a warning when global client touches tenant models
 *  - "strict": throw if global client touches tenant models
 */
const ENFORCEMENT =
  (process.env.TENANT_ENFORCEMENT_MODE ?? "warn").toLowerCase() as
    | "off"
    | "warn"
    | "strict";

// Lowercased model set for quick checks
const TENANT_SCOPED_LC = new Set(
  Array.from(TENANT_SCOPED).map((m) => m.toLowerCase())
);

/**
 * Wrap the global client: any operation on a tenant-scoped model via the
 * global client will be blocked (strict) or warned (warn).
 * Use your tenant-aware factory (e.g., prismaForTenant/tenantDb) for real work.
 */
export const db = prismaBase.$extends({
  name: "global-tenant-guard",
  query: {
    $allModels: {
      $allOperations({ model, operation, args, query }) {
        // Only care about models we consider tenant-scoped
        if (model && TENANT_SCOPED_LC.has(model.toLowerCase())) {
          if (ENFORCEMENT === "strict") {
            throw new Error(
              `[TenantGuard] Global Prisma client used for tenant-scoped model "${model}" op "${operation}". ` +
                `Use a tenant-scoped client (e.g., tenantDb()/prismaForTenant).`
            );
          }
          if (ENFORCEMENT === "warn") {
            // eslint-disable-next-line no-console
            console.warn(
              `[TenantGuard] WARN: global client used for tenant-scoped model "${model}" op "${operation}".`
            );
          }
        }
        return query(args);
      },
    },
  },
});

export const __rawDb = prismaBase;