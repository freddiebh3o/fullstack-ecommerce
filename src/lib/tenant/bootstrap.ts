import { db } from "@/lib/db/prisma";
import { DEFAULT_THEME } from "@/lib/branding/defaults";

const BUILTIN_ROLES = [
  { key: "OWNER",    name: "Owner",    description: "Full access to all tenant features", builtin: true },
  { key: "ADMIN",    name: "Admin",    description: "Manage catalog, members, and roles", builtin: true },
  { key: "EDITOR",   name: "Editor",   description: "Manage catalog (no member/role management)", builtin: true },
  { key: "READONLY", name: "Read-only",description: "View-only access", builtin: true },
];

export async function bootstrapTenant(tenantId: string, ownerUserId?: string) {
  // 1) Ensure built-in roles (existing code)
  for (const r of BUILTIN_ROLES) {
    await db.role.upsert({
      where: { tenantId_key: { tenantId, key: r.key as any } },
      update: { name: r.name, description: r.description, builtin: true },
      create: { tenantId, key: r.key as any, name: r.name, description: r.description, builtin: true },
    });
  }

  // 2) Ensure branding row exists (NEW)
  await db.tenantBranding.upsert({
    where: { tenantId },
    update: {}, // no-op; we don’t overwrite existing settings in bootstrap
    create: {
      tenantId,
      logoUrl: DEFAULT_THEME.logoUrl ?? null,
      theme: DEFAULT_THEME,
    },
  });

  // 3) Ensure owner membership (existing)
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
