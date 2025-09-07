// src/lib/tenant.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Resolve the current tenant for server components/pages:
 * 1) JWT session.user.currentTenantId (set by switch route)
 * 2) cookie "x-current-tenant-id" (set by switch route as fallback)
 * 3) FIRST membership for this user (dev-friendly fallback)
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const anyUser = session?.user as any;

  console.log("anyUser", anyUser);

  if (anyUser?.currentTenantId) return anyUser.currentTenantId;

  const jar = await cookies();
  const cookieTid = jar.get("x-current-tenant-id")?.value;
  if (cookieTid) return cookieTid;

  if (!session?.user?.id) return null;

  const first = await db.membership.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("first", first);

  return first?.tenantId ?? null;
}
