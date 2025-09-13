// src/app/api/admin/roles/[id]/route.ts
import { z } from "zod";
import { ok, error } from "@/lib/api/response";
import { audit } from "@/lib/audit/audit";
import { withTenantPermission } from "@/lib/auth/guards/api";
import { Prisma } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional().nullable(),
  permissionKeys: z.array(z.string().min(1)).min(1).optional(), // when provided, must be >=1
});

// GET /api/admin/roles/:id  (role.manage)
export const GET = withTenantPermission(
  "role.manage",
  async (_req, { db, tenantId, params }) => {
    const { id } = params as { id: string };

    const role = await db.role.findFirst({
      where: { id, tenantId },
      include: {
        permissions: { select: { permission: { select: { key: true, name: true } } } },
        _count: { select: { memberships: true } },
      },
    });
    if (!role) return error(404, "NOT_FOUND", "Role not found");

    return ok({
      id: role.id,
      key: role.key,
      name: role.name,
      builtin: role.builtin,
      description: role.description,
      permissionKeys: role.permissions.map((p) => p.permission.key),
      members: role._count.memberships,
    });
  }
);

// PATCH /api/admin/roles/:id  (role.manage)
export const PATCH = withTenantPermission(
  "role.manage",
  async (req, { db, tenantId, params, session }) => {
    const { id } = params as { id: string };

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());

    const role = await db.role.findFirst({ where: { id, tenantId } });
    if (!role) return error(404, "NOT_FOUND", "Role not found");

    const BUILTIN_KEYS = new Set(["OWNER", "ADMIN", "EDITOR", "READONLY"]);
    const isBuiltinCore = role.builtin && BUILTIN_KEYS.has(role.key);
    if (isBuiltinCore && parsed.data.permissionKeys) {
      return error(403, "FORBIDDEN", "Permissions of built-in roles cannot be modified.");
    }

    const updates: { name?: string; description?: string | null } = {};
    if (typeof parsed.data.name === "string") updates.name = parsed.data.name;
    if ("description" in parsed.data) updates.description = parsed.data.description ?? null;

    // If permissionKeys provided, fully replace assignments (require >=1)
    if (parsed.data.permissionKeys) {
      const keys = parsed.data.permissionKeys;
      const perms = await db.permission.findMany({
        where: { key: { in: keys } },
        select: { id: true, key: true },
      });
      if (perms.length !== keys.length) {
        const found = new Set(perms.map((p) => p.key));
        const missing = keys.filter((k) => !found.has(k));
        return error(400, "BAD_REQUEST", `Unknown permission keys: ${missing.join(", ")}`);
      }

      try {
        const updated = await db.$transaction(async (tx) => {
          const base = await tx.role.update({
            where: { id },
            data: updates,
          });
          await tx.permissionAssignment.deleteMany({ where: { roleId: id } });
          await tx.permissionAssignment.createMany({
            data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
            skipDuplicates: true,
          });
          return base;
        });

        await audit(db, tenantId, session.user.id, "role.update", {
          roleId: id,
          name: updates.name,
          description: updates.description,
          permissionKeys: keys,
        });

        return ok({ id: updated.id });
      } catch (e) {
        console.error("[roles.PATCH] error", e);
        return error(500, "SERVER_ERROR", "Failed to update role");
      }
    }

    // Only name/description change
    const updated = await db.role.update({ where: { id }, data: updates });
    await audit(db, tenantId, session.user.id, "role.update", {
      roleId: id,
      changed: updates,
    });
    return ok({ id: updated.id });
  }
);

// DELETE /api/admin/roles/:id  (role.manage)
export const DELETE = withTenantPermission(
  "role.manage",
  async (_req, { db, tenantId, params, session }) => {
    const { id } = params as { id: string };

    const role = await db.role.findFirst({
      where: { id, tenantId },
      select: { id: true, key: true, builtin: true, _count: { select: { memberships: true } } },
    });
    if (!role) return error(404, "NOT_FOUND", "Role not found");

    if (role.builtin) return error(403, "FORBIDDEN", "Built-in roles cannot be deleted");
    if (role._count.memberships > 0) {
      return error(409, "CONFLICT", "Cannot delete a role that is assigned to members");
    }

    if (role.key === "OWNER") {
      const ownerCount = await db.membership.count({
        where: { tenantId, role: { key: "OWNER" } },
      });
      if (ownerCount > 0) {
        return error(409, "CONFLICT", "Cannot delete the OWNER role.");
      }
    }

    try {
      await db.permissionAssignment.deleteMany({ where: { roleId: id } });
      await db.role.delete({ where: { id } });

      await audit(db, tenantId, session.user.id, "role.delete", { roleId: id });

      return ok({ id, deleted: true });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // fallback in case of hidden FKs
        if (e.code === "P2003") return error(409, "CONFLICT", "Role is in use and cannot be deleted");
      }
      console.error("[roles.DELETE] error", e);
      return error(500, "SERVER_ERROR", "Failed to delete role");
    }
  }
);
