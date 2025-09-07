// src/app/api/admin/tenant/switch/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({ tenantId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const sysRole = (session?.user as any)?.role as "USER" | "ADMIN" | "SUPERADMIN" | undefined;

  if (!userId || !sysRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = bodySchema.parse(await req.json());

  // Make sure the target tenant actually exists
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // SUPERADMIN: can switch to any tenant without membership
  if (sysRole !== "SUPERADMIN") {
    // Others (ADMIN/USER): must be a member of the target tenant
    const member = await db.membership.findFirst({
      where: { userId, tenantId },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const res = NextResponse.json({ ok: true });

  // Cookie is our source of truth for tenant resolution on the server
  res.cookies.set("x-current-tenant-id", tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
}
