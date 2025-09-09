// src/lib/api/context.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { db } from "@/lib/db/prisma";
import { getCurrentTenantId } from "@/lib/tenant/resolve";

/**
 * Standardizes auth + tenant resolution for Admin API routes.
 * - requires system role ADMIN or SUPERADMIN
 * - tries cookie-selected tenant first
 * - falls back to the user's first membership (handy in dev)
 *
 * Usage:
 *   const ctx = await getApiTenantCtx();
 *   if ('error' in ctx) return ctx.error; // early return
 *   const { db, tenantId, session } = ctx;
 */
export async function getApiTenantCtx():
  Promise<
    | { error: NextResponse }
    | { db: typeof db; tenantId: string; session: any }
  >
{
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  // 1) preferred: whatever the switcher put in the token/cookie
  let tenantId = await getCurrentTenantId();

  // 2) fallback: first membership (nice for first-run/dev)
  if (!tenantId) {
    const first = await db.membership.findFirst({
      where: { userId: session.user.id },
      select: { tenantId: true },
      orderBy: { createdAt: "asc" },
    });
    tenantId = first?.tenantId ?? null;
  }

  if (!tenantId) {
    return { error: NextResponse.json({ error: "No tenant selected" }, { status: 400 }) };
  }

  // If you later return a $extends-scoped client, do it here.
  const scoped = db;

  return { db: scoped, tenantId, session };
}
