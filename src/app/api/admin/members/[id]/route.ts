// src/app/api/admin/members/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { can } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenant-db";
import type { PrismaClient } from "@prisma/client";

const patchSchema = z.object({
  roleKey: z.enum(["OWNER", "ADMIN", "EDITOR", "READONLY"]),
});

// --- Helper functions (explicit scoping with tenantId) ---

async function ensureNotDemotingLastOwner(
  db: PrismaClient,
  tenantId: string,
  membershipId: string,
  newRoleKey?: "OWNER" | "ADMIN" | "EDITOR" | "READONLY"
) {
  if (!newRoleKey || newRoleKey === "OWNER") return;

  // Check current role of the target membership within this tenant
  const target = await db.membership.findFirst({
    where: { id: membershipId, tenantId },
    select: { role: { select: { key: true } } },
  });
  if (!target) return;
  if (target.role?.key !== "OWNER") return;

  // Count owners within this tenant
  const owners = await db.membership.count({
    where: { tenantId, role: { key: "OWNER" } },
  });
  if (owners <= 1) {
    throw new Error("Cannot demote the last remaining OWNER");
  }
}

async function ensureNotDeletingLastOwner(
  db: PrismaClient,
  tenantId: string,
  membershipId: string
) {
  const target = await db.membership.findFirst({
    where: { id: membershipId, tenantId },
    select: { role: { select: { key: true } } },
  });
  if (!target) return;
  if (target.role?.key !== "OWNER") return;

  const owners = await db.membership.count({
    where: { tenantId, role: { key: "OWNER" } },
  });
  if (owners <= 1) {
    throw new Error("Cannot remove the last remaining OWNER");
  }
}

// --- PATCH /admin/members/[id] ---

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } } // <- not a Promise
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { db, tenantId } = await tenantDb();

  if (!(await can("member.manage", tenantId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  // Ensure membership belongs to this tenant
  const existing = await db.membership.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // last-owner safeguard
  await ensureNotDemotingLastOwner(db, tenantId, id, parsed.data.roleKey);

  const role = await db.role.findFirst({
    where: { key: parsed.data.roleKey },
    select: { id: true },
  });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 400 });
  }

  const updated = await db.membership.update({
    where: { id }, // id is globally unique; tenancy already verified above
    data: { roleId: role.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, key: true, name: true } },
    },
  });

  return NextResponse.json(updated, { status: 200 });
}

// --- DELETE /admin/members/[id] ---

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } } // <- not a Promise
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { db, tenantId } = await tenantDb();

  if (!(await can("member.manage", tenantId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  // Ensure membership belongs to this tenant
  const existing = await db.membership.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // last-owner safeguard
  await ensureNotDeletingLastOwner(db, tenantId, id);

  await db.membership.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
