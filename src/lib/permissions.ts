// src/lib/permissions.ts
import { db } from "./db";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function can(permissionKey: string, tenantId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  if ((session.user as any).role === "SUPERADMIN") return true;

  const tId = tenantId || (session as any)?.currentTenantId;
  if (!tId) return false;

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, tenantId: tId },
    select: {
      role: { select: { permissions: { select: { permission: { select: { key: true } } } } } },
    },
  });

  const keys = new Set(membership?.role.permissions.map(p => p.permission.key) ?? []);
  return keys.has(permissionKey);
}
