// src/lib/tenant/bootstrap.ts
import { db } from "@/lib/db/prisma";

export async function bootstrapTenant(tenantId: string, ownerUserId: string) {
  const keys = ["OWNER", "ADMIN", "EDITOR", "READONLY"] as const;
  const existing = await db.role.findMany({ where: { tenantId }, select: { key: true } });
  const missing = keys.filter((k) => !existing.some((e) => e.key === k));

  for (const key of missing) {
    await db.role.create({
      data: { tenantId, key, name: key.charAt(0) + key.slice(1).toLowerCase() },
    });
  }

  const ownerRole = await db.role.findFirst({
    where: { tenantId, key: "OWNER" },
    select: { id: true },
  });

  if (ownerRole) {
    await db.membership.upsert({
      where: { tenantId_userId: { tenantId, userId: ownerUserId } },
      update: { roleId: ownerRole.id },
      create: { tenantId, userId: ownerUserId, roleId: ownerRole.id },
    });
  }
}
