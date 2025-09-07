// src/app/api/admin/members/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { can } from "@/lib/permissions";
import { getCurrentTenantId } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";

const postSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().optional(),
  roleKey: z.enum(["OWNER", "ADMIN", "EDITOR", "READONLY"]),
  password: z.string().min(8).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN" && (session?.user as any)?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  // View members requires manage for now (or introduce a separate member.read later)
  if (!(await can("member.manage", tenantId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { db } = await tenantDb();

  const memberships = await db.membership.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, key: true, name: true } },
    },
  });

  return NextResponse.json(memberships, { status: 200 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { db, tenantId } = await tenantDb();
  if (!(await can("member.manage", tenantId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const { email, name, roleKey, password } = parsed.data;

  const role = await db.role.findFirst({ where: { key: roleKey }, select: { id: true } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 400 });

  // Create or find user (global table — not tenant-scoped)
  const lower = email.toLowerCase();
  const global = (await import("@/lib/db")).db; // import plain db lazily to avoid top-level import
  let user = await global.user.findUnique({ where: { email: lower } });
  if (!user) {
    const pw = password ?? "TempPass123!";
    user = await global.user.create({
      data: {
        email: lower,
        name: name ?? null,
        role: "USER",
        passwordHash: await bcrypt.hash(pw, 10),
      },
    });
  }

  // Upsert membership (scoped)
  const member = await db.membership.upsert({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    update: { roleId: role.id },
    create: { tenantId, userId: user.id, roleId: role.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, key: true, name: true } },
    },
  });

  return NextResponse.json(member, { status: 201 });
}
