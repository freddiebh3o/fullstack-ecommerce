// src/app/api/admin/members/[id]/route.ts
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { ok, error } from "@/lib/api/response";
import { withTenantPermission } from "@/lib/auth/guards/api";
import { audit } from "@/lib/audit/audit";

const patchSchema = z.object({
  roleKey: z.string().min(2),
});

// Helper: can the current user assign OWNER in this tenant?
async function canAssignOwner(db: any, tenantId: string, session: any) {
  const sysRole = (session?.user as any)?.role;
  if (sysRole === "SUPERADMIN" || sysRole === "ADMIN") return true;

  // must be OWNER of this tenant
  const me = await db.membership.findFirst({
    where: { tenantId, userId: session.user.id },
    select: { role: { select: { key: true } } },
  });
  return me?.role?.key === "OWNER";
}

async function ensureNotDemotingLastOwner(
  db: PrismaClient,
  tenantId: string,
  membershipId: string,
  newRoleKey?: string
) {
  if (!newRoleKey || newRoleKey === "OWNER") return;
  const target = await db.membership.findFirst({
    where: { id: membershipId, tenantId },
    select: { role: { select: { key: true } } },
  });
  if (!target || target.role?.key !== "OWNER") return;
  const owners = await db.membership.count({
    where: { tenantId, role: { key: "OWNER" } },
  });
  if (owners <= 1) throw new Error("Cannot demote the last remaining OWNER");
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
  if (!target || target.role?.key !== "OWNER") return;
  const owners = await db.membership.count({
    where: { tenantId, role: { key: "OWNER" } },
  });
  if (owners <= 1) throw new Error("Cannot remove the last remaining OWNER");
}

// PATCH /api/admin/members/:id  (member.manage)
export const PATCH = withTenantPermission(
  "member.manage",
  async (req, { db, tenantId, params, session }) => {
    const { id } = params as { id: string };

    // Ensure membership belongs to this tenant
    const exists = await db.membership.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!exists) return error(404, "NOT_FOUND", "Membership not found");

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }

    // Enforce OWNER promotion rule
    if (parsed.data.roleKey === "OWNER") {
      const allowed = await canAssignOwner(db, tenantId, session);
      if (!allowed) {
        return error(403, "FORBIDDEN", "Only tenant owners or system administrators can assign owner.");
      }
    }

    // Safeguard: last OWNER cannot be demoted
    await ensureNotDemotingLastOwner(db, tenantId, id, parsed.data.roleKey);

    const role = await db.role.findFirst({
      where: { tenantId, key: parsed.data.roleKey },
      select: { id: true },
    });
    if (!role) return error(400, "BAD_REQUEST", "Role not found");

    const updated = await db.membership.update({
      where: { id },
      data: { roleId: role.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, key: true, name: true } },
      },
    });

    await audit(db, tenantId, session.user.id, "member.updateRole", {
      membershipId: updated.id,
      roleKey: parsed.data.roleKey,
    });

    return ok(updated);
  }
);

// DELETE /api/admin/members/:id  (member.manage)
export const DELETE = withTenantPermission(
  "member.manage",
  async (_req, { db, tenantId, params, session }) => {
    const { id } = params as { id: string };

    // Ensure membership belongs to this tenant
    const exists = await db.membership.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!exists) return error(404, "NOT_FOUND", "Membership not found");

    await ensureNotDeletingLastOwner(db, tenantId, id);

    await db.membership.delete({ where: { id } });
    await audit(db, tenantId, session.user.id, "member.remove", { membershipId: id });

    return ok({ id, deleted: true });
  }
);
