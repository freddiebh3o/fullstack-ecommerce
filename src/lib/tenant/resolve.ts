// src/lib/tenant/resolve.ts
import "server-only";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { __rawDb } from "@/lib/db/prisma";
import { prismaForTenant } from "@/lib/db/tenant-extends";

const TENANT_COOKIE = "x-current-tenant-id";

/**
 * Resolve the *valid* current tenant for the logged-in user.
 * Order:
 *  1) cookie(x-current-tenant-id) if it exists *and* is valid for this user (or SUPERUSER)
 *  2) first membership’s tenant
 *  3) (SUPERUSER only) first tenant in system
 *  4) null
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const isSuper = (session?.user as any)?.role === "SUPERUSER";
  const cookieStore = await cookies();

  // 1) cookie
  const cookieTenantId = cookieStore.get(TENANT_COOKIE)?.value ?? null;
  if (cookieTenantId) {
    if (isSuper) {
      const exists = await __rawDb.tenant.findUnique({ where: { id: cookieTenantId }, select: { id: true } });
      if (exists) return cookieTenantId;
    } else if (userId) {
      // 🔑 Validate membership via a TENANT-SCOPED client for that cookie tenant
      const tdb = prismaForTenant(__rawDb, cookieTenantId);
      const hasMembership = await tdb.membership.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (hasMembership) return cookieTenantId;
    }
  }

  // 2) first membership (system-wide; no tenant context yet)
  if (userId) {
    const m = await __rawDb.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { tenantId: true },
    });
    if (m?.tenantId) return m.tenantId;
  }

  // 3) superuser fallback: first tenant in system
  if (isSuper) {
    const t = await __rawDb.tenant.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (t?.id) return t.id;
  }

  // 4) nothing
  return null;
}

export async function requireTenantId(): Promise<string> {
  const id = await getCurrentTenantId();
  if (!id) throw new Error("No tenant selected");
  return id;
}
