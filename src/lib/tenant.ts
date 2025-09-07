// src/lib/tenant.ts
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Resolve the *valid* current tenant for the logged-in user.
 * Order:
 *  1) cookie("tenantId") if it exists *and* the user has a membership there (or is SUPERADMIN)
 *  2) first membership’s tenant
 *  3) (SUPERADMIN only) first tenant in system
 *  4) null
 */
export async function getCurrentTenantId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const isSuper = (session?.user as any)?.role === "SUPERADMIN";

  // 1) cookie
  const cookieStore = await cookies();
  const cookieTenantId = cookieStore.get("tenantId")?.value || null;

  if (cookieTenantId) {
    if (isSuper) {
      // superadmin: any tenant is OK if it exists
      const exists = await db.tenant.findUnique({ where: { id: cookieTenantId }, select: { id: true } });
      if (exists) return cookieTenantId;
    } else if (userId) {
      const hasMembership = await db.membership.findFirst({
        where: { userId, tenantId: cookieTenantId },
        select: { id: true },
      });
      if (hasMembership) return cookieTenantId;
    }
  }

  // 2) fallback: first membership
  if (userId) {
    const m = await db.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { tenantId: true },
    });
    if (m?.tenantId) return m.tenantId;
  }

  // 3) superadmin fallback: first tenant in system
  if (isSuper) {
    const t = await db.tenant.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (t?.id) return t.id;
  }

  // 4) nothing
  return null;
}
