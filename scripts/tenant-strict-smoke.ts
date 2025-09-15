// scripts/tenant-strict-smoke.ts
import "dotenv/config";

// Use RELATIVE imports to avoid alias issues
import { db } from "../src/lib/db/prisma";
import { TENANT_SCOPED } from "../src/lib/db/tenant-scoped";
import { prismaForTenant } from "../src/lib/db/tenant-extends";
import { PrismaClient } from "@prisma/client";

// Helper: map "ProductImage" -> client.productImage
function delegateOf(client: any, model: string) {
  const prop = model.charAt(0).toLowerCase() + model.slice(1);
  return client[prop];
}

async function main() {
  const mode = process.env.TENANT_ENFORCEMENT_MODE;
  if (mode !== "strict") {
    console.warn(`[warn] TENANT_ENFORCEMENT_MODE=${mode}. Set it to "strict" in .env for this check.`);
  }

  // 1) NEGATIVE check: global client + scoped model MUST throw in strict mode
  const offenders: string[] = [];
  for (const m of Array.from(TENANT_SCOPED)) {
    const delegate = delegateOf(db as any, m);
    if (!delegate) continue;
    try {
      await delegate.findMany({ take: 1 });   // intentionally unscoped
      offenders.push(m);                      // ❌ strict mode should have thrown
    } catch {
      // ✅ expected: strict mode enforcement threw
    }
  }

  // 2) POSITIVE check: a tenant-scoped client SHOULD work normally
  const tenant = await (db as any).tenant.findFirst({ select: { id: true } });
  if (!tenant) throw new Error("No tenants found. Seed at least one tenant first.");

  // Use a RAW PrismaClient for the tenant client factory (avoid type mismatch with extended 'db')
  const base = new PrismaClient({ log: ["warn", "error"] });
  try {
    // prismaForTenant signature: (baseClient, tenantId) => PrismaClient
    const tdb = prismaForTenant(base, tenant.id);

    const okModel = Array.from(TENANT_SCOPED)[0];
    const okDelegate = delegateOf(tdb as any, okModel);
    await okDelegate.findMany({ take: 1 });   // should succeed without throwing

    console.log(JSON.stringify({
      strictMode: mode,
      negativeOffenders: offenders,           // should be []
      positiveCheck: { model: okModel, tenantId: tenant.id, ok: true }
    }, null, 2));
  } finally {
    await base.$disconnect();
  }
}

main().catch((e) => {
  console.error("Smoke test failed:", e);
  process.exit(1);
});
