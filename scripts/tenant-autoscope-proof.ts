// scripts/tenant-autoscope-proof.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { prismaForTenant } from "../src/lib/db/tenant-extends";
import { TENANT_SCOPED } from "../src/lib/db/tenant-scoped";

// Helper: map "ProductImage" -> client.productImage
function delegateOf(client: any, model: string) {
  const prop = model.charAt(0).toLowerCase() + model.slice(1);
  return client[prop];
}

type ModelCheck = {
  model: string;
  tenantA: string;
  tenantB: string;
  recordId?: string;
  goodPath?: boolean;             // A sees its own row
  crossTenantVisibleToB?: boolean; // B must NOT see A's row
  skipped?: "noDataForTenantA" | "delegateMissing";
  error?: string;
  pass?: boolean;                 // goodPath && !crossTenantVisibleToB
};

async function main() {
  const base = new PrismaClient({ log: ["warn", "error"] });

  const results: ModelCheck[] = [];
  let failed = 0;

  try {
    // Need two tenants
    const tenants = await base.tenant.findMany({ select: { id: true }, take: 2 });
    const [tA, tB] = tenants;
    if (!tA || !tB) throw new Error("Need at least two tenants. Seed another tenant first.");

    // Create tenant-scoped clients once
    const clientA = prismaForTenant(base, tA.id);
    const clientB = prismaForTenant(base, tB.id);

    for (const model of Array.from(TENANT_SCOPED)) {
      const res: ModelCheck = { model, tenantA: tA.id, tenantB: tB.id };
      try {
        const baseDelegate = delegateOf(base, model);
        if (!baseDelegate) {
          res.skipped = "delegateMissing";
          results.push(res);
          continue;
        }

        // Find a row for Tenant A using the RAW base client (no app-layer guards)
        const row = await baseDelegate.findFirst({
          where: { tenantId: tA.id },
          select: { id: true, tenantId: true },
        });

        if (!row) {
          res.skipped = "noDataForTenantA";
          results.push(res);
          continue;
        }

        res.recordId = row.id;

        // A should see its own record
        const aDelegate = delegateOf(clientA, model);
        const gotA = await aDelegate.findFirst({ where: { id: row.id } });
        res.goodPath = !!gotA;

        // B MUST NOT see A's record (auto-injected tenant filter)
        const bDelegate = delegateOf(clientB, model);
        const gotB = await bDelegate.findFirst({ where: { id: row.id } });
        res.crossTenantVisibleToB = !!gotB;

        res.pass = !!(res.goodPath && !res.crossTenantVisibleToB);
        if (!res.pass) failed++;
      } catch (e: any) {
        res.error = String(e?.message ?? e);
        failed++;
      }
      results.push(res);
    }

    // Print a neat JSON summary
    const summary = {
      tenants: { A: tA.id, B: tB.id },
      totals: {
        modelsChecked: results.length,
        skipped: results.filter(r => r.skipped).length,
        passed: results.filter(r => r.pass).length,
        failed: results.filter(r => r.pass === false || r.error).length,
      },
      results,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await base.$disconnect();
  }

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
