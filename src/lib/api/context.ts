// src/lib/api/context.ts
import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { tenantDb } from "@/lib/db/tenant-db";
import { getCurrentTenantId } from "@/lib/tenant/resolve";
import type { PrismaClient } from "@prisma/client";

/**
 * Standardizes auth + tenant resolution for Admin API routes.
 * - requires system role SUPERUSER
 * - uses cookie-selected tenant (getCurrentTenantId already falls back to first membership)
 */
export async function getApiTenantCtx(): Promise<
  | { error: NextResponse }
  | { db: PrismaClient; tenantId: string; session: Session }
> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (role !== "SUPERUSER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { error: NextResponse.json({ error: "No tenant selected" }, { status: 400 }) };
  }

  // Tenant-scoped client (internally validates tenant via requireTenantId)
  const { db } = await tenantDb();
  return { db, tenantId, session };
}
