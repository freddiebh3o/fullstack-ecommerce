// src/app/api/admin/tenant/switch/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { requireApiSession } from "@/lib/auth/guards/api";
import { error } from "@/lib/api/response";
import { __rawDb } from "@/lib/db/prisma";
import { prismaForTenant } from "@/lib/db/tenant-extends";

const bodySchema = z.object({ tenantId: z.string().min(1) });

export async function POST(req: Request) {
  const res = await requireApiSession();
  if (!res.ok) return res.response;

  const { session } = res;
  const userId = session.user?.id as string | undefined;
  const sysRole = (session?.user as any)?.role as "USER" | "SUPERUSER" | undefined;

  if (!userId || !sysRole) {
    const r = error(401, "UNAUTHENTICATED", "You must be signed in");
    r.headers.set("x-deny-reason", "unauthorized");
    return r;
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
  }
  const { tenantId } = parsed.data;

  // Make sure the target tenant actually exists
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) {
    return error(404, "NOT_FOUND", "Tenant not found");
  }

  // SUPERUSER: can switch to any tenant without membership
  if (sysRole !== "SUPERUSER") {
    const tdb = prismaForTenant(__rawDb, tenantId);
    const member = await tdb.membership.findFirst({ where: { userId }, select: { id: true } });
    if (!member) { /* 403 */ }
  }

  const json = NextResponse.json({ ok: true });

  // Cookie is our source of truth for tenant resolution on the server
  json.cookies.set("x-current-tenant-id", tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return json;
}
