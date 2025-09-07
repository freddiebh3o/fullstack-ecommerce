// src/app/api/admin/members/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getCurrentTenantId } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { getTenantDb } from "@/lib/tenant-db";

const paramsSchema = z.object({ id: z.string().min(1) });
const patchSchema = z.object({
  roleKey: z.enum(["OWNER", "ADMIN", "EDITOR", "READONLY"]),
});

// helpers (use tenant-scoped client inside helpers)
async function ensureNotDemotingLastOwner(db: Awaited<ReturnType<typeof getTenantDb>>, membershipId: string, newRoleKey?: "OWNER"|"ADMIN"|"EDITOR"|"READONLY") {
  if (!newRoleKey || newRoleKey === "OWNER") return;
  const target = await db.membership.findUnique({
    where: { id: membershipId },
    select: { role: { select: { key: true } } },
  });
  if (!target) return;
  if (target.role.key !== "OWNER") return;

  const owners = await db.membership.count({
    where: { role: { key: "OWNER" } },
  });
  if (owners <= 1) {
    throw new Error("Cannot demote the last remaining OWNER");
  }
}

async function ensureNotDeletingLastOwner(db: Awaited<ReturnType<typeof getTenantDb>>, membershipId: string) {
  const target = await db.membership.findUnique({
    where: { id: membershipId },
    select: { role: { select: { key: true } } },
  });
  if (!target) return;
  if (target.role.key !== "OWNER") return;

  const owners = await db.membership.count({
    where: { role: { key: "OWNER" } },
  });
  if (owners <= 1) {
    throw new Error("Cannot remove the last remaining OWNER");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN" && (session?.user as any)?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
  if (!(await can("member.manage", tenantId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getTenantDb();

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  // ensure membership belongs to this tenant (scoped)
  const existing = await db.membership.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // last-owner safeguard
  await ensureNotDemotingLastOwner(db, id, parsed.data.roleKey);

  const role = await db.role.findFirst({
    where: { key: parsed.data.roleKey },
    select: { id: true },
  });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 400 });

  const updated = await db.membership.update({
    where: { id },
    data: { roleId: role.id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, key: true, name: true } },
    },
  });

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN" && (session?.user as any)?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
  if (!(await can("member.manage", tenantId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getTenantDb();
  const { id } = await params;

  // ensure membership belongs to this tenant (scoped)
  const existing = await db.membership.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // last-owner safeguard
  await ensureNotDeletingLastOwner(db, id);

  await db.membership.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
