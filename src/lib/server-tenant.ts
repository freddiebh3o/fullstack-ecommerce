// src/lib/server-tenant.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Resolve current tenant for server components/pages in this order:
 * 1) cookie "x-current-tenant-id" (set by switch route)
 * 2) JWT session.user.currentTenantId (legacy / optional)
 * 3) FIRST membership for this user (dev-friendly fallback)
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const jar = await cookies();
  const cookieTid = jar.get("x-current-tenant-id")?.value;
  if (cookieTid) return cookieTid;

  const session = await getServerSession(authOptions);
  const anyUser = session?.user as any;
  if (anyUser?.currentTenantId) return anyUser.currentTenantId;

  if (!session?.user?.id) return null;

  const first = await db.membership.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true },
    orderBy: { createdAt: "asc" },
  });

  return first?.tenantId ?? null;
}
