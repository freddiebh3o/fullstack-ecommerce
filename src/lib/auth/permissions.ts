// src/lib/auth/permissions.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { db } from "@/lib/db/prisma";

/**
 * Strict permission check:
 * - Only SUPERADMIN (system role) bypasses everything.
 * - Otherwise, we look up the user's membership for the *exact* tenant
 *   and return true only if the *exact* permission key is present.
 */
export async function can(permissionKey: string, tenantId: string | null | undefined) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  // System SUPERADMIN bypass (global)
  if ((session.user as any).role === "SUPERADMIN") return true;

  if (!tenantId) return false;

  // Fetch the permission keys attached to the user's role in this tenant
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, tenantId },
    select: {
      role: {
        select: {
          permissions: {
            select: { permission: { select: { key: true } } },
          },
        },
      },
    },
  });

  const keys = new Set(
    (membership?.role?.permissions ?? []).map((p) => p.permission.key)
  );

  // TEMP: debug log to verify what's actually granted
  console.log("[can] userId:", session.user.id,
              "tenantId:", tenantId,
              "checking:", permissionKey,
              "granted:", Array.from(keys));

  // STRICT exact match (no prefix/suffix/wildcard matching)
  return keys.has(permissionKey);
}

/** Helper for "any of these permissions" */
export async function canAny(permissionKeys: string[], tenantId: string) {
  for (const key of permissionKeys) {
    if (await can(key, tenantId)) return true;
  }
  return false;
}
