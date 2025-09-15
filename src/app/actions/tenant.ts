// src/app/actions/tenant.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { __rawDb } from "@/lib/db/prisma";
import { prismaForTenant } from "@/lib/db/tenant-extends";

// 🔧 Use the same cookie name the resolver expects
const TENANT_COOKIE = "x-current-tenant-id";

/**
 * Ensure the tenant cookie equals the desired value.
 * No-op if it's already correct. Revalidates only when it changes.
 */
export async function ensureTenantCookie(desiredTenantId: string | null) {
  if (!desiredTenantId) return { changed: false };

  const cookieStore = await cookies();
  const current = cookieStore.get(TENANT_COOKIE)?.value || null;
  if (current === desiredTenantId) return { changed: false };

  cookieStore.set(TENANT_COOKIE, desiredTenantId, { path: "/" });
  // Revalidate admin shell so server components refetch with new cookie (if relevant)
  revalidatePath("/admin", "layout");
  return { changed: true };
}

/** Set current tenant cookie after validating the user can access it */
export async function setCurrentTenant(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const isSuper = (session.user as any)?.role === "SUPERUSER";
  if (!isSuper) {
    // check membership via TENANT client for the *target* tenant
    const tdb = prismaForTenant(__rawDb, tenantId);
    const hasMembership = await tdb.membership.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!hasMembership) throw new Error("FORBIDDEN");
  } else {
    const exists = await __rawDb.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!exists) throw new Error("NOT_FOUND");
  }

  const cookieStore = await cookies();
  cookieStore.set(TENANT_COOKIE, tenantId, { path: "/" });

  // Revalidate admin pages so server components refetch with the new tenant
  revalidatePath("/admin", "layout");
  revalidatePath("/admin"); // index
}
