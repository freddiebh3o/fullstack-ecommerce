// src/lib/auth/permissions.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { __rawDb } from "@/lib/db/prisma";
import { prismaForTenant } from "@/lib/db/tenant-extends";

/**
 * Strict permission check:
 * - SUPERUSER bypasses everything.
 * - Otherwise, look up the user's membership *in the given tenant*
 *   and check for an exact permission key.
 */
export async function can(permissionKey: string, tenantId: string | null | undefined) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  // System SUPERUSER bypass (global)
  if ((session.user as any).role === "SUPERUSER") return true;

  if (!tenantId) return false;

  // 🔑 TENANT-SCOPED client for this tenant id
  const tdb = prismaForTenant(__rawDb, tenantId);

  // Fetch the permission keys attached to the user's role in this tenant
  const membership = await tdb.membership.findFirst({
    where: { userId: session.user.id },
    select: {
      role: {
        select: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });

  const keys = new Set(
    (membership?.role?.permissions ?? []).map((p) => p.permission.key)
  );

  return keys.has(permissionKey);
}

/** Helper for "any of these permissions" */
export async function canAny(permissionKeys: string[], tenantId: string) {
  for (const key of permissionKeys) {
    if (await can(key, tenantId)) return true;
  }
  return false;
}
