// src/app/actions/tenant.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Ensure the "tenantId" cookie equals the desired value.
 * No-op if it's already correct. Revalidates only when it changes.
 */
export async function ensureTenantCookie(desiredTenantId: string | null) {
  if (!desiredTenantId) return { changed: false };

  const cookieStore = await cookies();
  const current = cookieStore.get("tenantId")?.value || null;
  if (current === desiredTenantId) return { changed: false };

  cookieStore.set("tenantId", desiredTenantId, { path: "/" });
  // Revalidate admin shell so server components refetch with new cookie (if relevant)
  revalidatePath("/admin", "layout");
  return { changed: true };
}

/** Set current tenant cookie after validating the user can access it */
export async function setCurrentTenant(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const isSuper = (session.user as any)?.role === "SUPERADMIN";
  if (!isSuper) {
    const hasMembership = await db.membership.findFirst({
      where: { userId: session.user.id, tenantId },
      select: { id: true },
    });
    if (!hasMembership) throw new Error("FORBIDDEN");
  } else {
    const exists = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!exists) throw new Error("NOT_FOUND");
  }

  const cookieStore = await cookies();
  cookieStore.set("tenantId", tenantId, { path: "/" });
  // Revalidate admin pages so server components refetch with the new tenant
  revalidatePath("/admin", "layout");
  revalidatePath("/admin"); // index
}
