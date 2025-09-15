// src/lib/tenant/bootstrap.ts
import { __rawDb } from "@/lib/db/prisma";
import { prismaForTenant } from "@/lib/db/tenant-extends";
import { DEFAULT_THEME } from "@/lib/branding/defaults";

const BUILTIN_ROLES = [
  { key: "OWNER",    name: "Owner",    description: "Full access to all tenant features", builtin: true },
  { key: "ADMIN",    name: "Admin",    description: "Manage catalog, members, and roles", builtin: true },
  { key: "EDITOR",   name: "Editor",   description: "Manage catalog (no member/role management)", builtin: true },
  { key: "READONLY", name: "Read-only",description: "View-only access", builtin: true },
];

export async function bootstrapTenant(tenantId: string, ownerUserId?: string) {
  const tdb = prismaForTenant(__rawDb, tenantId);

  for (const r of BUILTIN_ROLES) {
    await tdb.role.upsert({
      where: { tenantId_key: { tenantId, key: r.key as any } },
      update: { name: r.name, description: r.description, builtin: true },
      create: { tenantId, key: r.key as any, name: r.name, description: r.description, builtin: true },
    });
  }

  await tdb.tenantBranding.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId, logoUrl: DEFAULT_THEME.logoUrl ?? null, theme: DEFAULT_THEME },
  });

  if (ownerUserId) {
    const ownerRole = await tdb.role.findFirst({ where: { key: "OWNER" }, select: { id: true } });
    if (ownerRole) {
      await tdb.membership.upsert({
        where: { tenantId_userId: { tenantId, userId: ownerUserId } },
        update: { roleId: ownerRole.id },
        create: { tenantId, userId: ownerUserId, roleId: ownerRole.id },
      });
    }
  }
}
