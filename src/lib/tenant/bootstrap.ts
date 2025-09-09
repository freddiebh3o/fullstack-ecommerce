// src/lib/tenant/bootstrap.ts
import { db } from "@/lib/db/prisma";

const BUILTIN_ROLES = [
  { key: "OWNER",    name: "Owner",    description: "Full access to all tenant features", builtin: true },
  { key: "ADMIN",    name: "Admin",    description: "Manage catalog, members, and roles", builtin: true },
  { key: "EDITOR",   name: "Editor",   description: "Manage catalog (no member/role management)", builtin: true },
  { key: "READONLY", name: "Read-only",description: "View-only access", builtin: true },
];

export async function bootstrapTenant(tenantId: string, ownerUserId?: string) {
  // Ensure built-in roles exist (idempotent)
  for (const r of BUILTIN_ROLES) {
    await db.role.upsert({
      where: { tenantId_key: { tenantId, key: r.key } },
      update: { name: r.name, description: r.description, builtin: true },
      create: { tenantId, key: r.key, name: r.name, description: r.description, builtin: true },
    });
  }

  // Optionally: ensure ownerUserId has an OWNER membership
  if (ownerUserId) {
    const ownerRole = await db.role.findFirst({ where: { tenantId, key: "OWNER" }, select: { id: true } });
    if (ownerRole) {
      await db.membership.upsert({
        where: { tenantId_userId: { tenantId, userId: ownerUserId } },
        update: { roleId: ownerRole.id },
        create: { tenantId, userId: ownerUserId, roleId: ownerRole.id },
      });
    }
  }
}
