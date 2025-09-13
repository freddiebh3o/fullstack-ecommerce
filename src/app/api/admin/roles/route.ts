// src/app/api/admin/roles/route.ts
import { z } from "zod";
import { ok, error } from "@/lib/api/response";
import { audit } from "@/lib/audit/audit";
import { withTenantPermission } from "@/lib/auth/guards/api";
import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils/slug"; // if you later normalize keys, optional

const keyRegex = /^[a-z0-9._-]+$/; // conservative, url-safe keys

const createSchema = z.object({
  name: z.string().trim().min(2),
  key: z.string().trim().min(2).regex(keyRegex, "Key can contain a-z, 0-9, dot, underscore, hyphen"),
  description: z.string().trim().optional(),
  permissionKeys: z.array(z.string().min(1)).min(1, "Select at least one permission"),
});

// GET /api/admin/roles  (role.manage)
export const GET = withTenantPermission(
  "role.manage",
  async (_req, { db, tenantId }) => {
    const roles = await db.role.findMany({
      where: { tenantId },
      orderBy: [{ builtin: "desc" }, { key: "asc" }],
      include: {
        permissions: { select: { permission: { select: { key: true, name: true } } } },
        _count: { select: { memberships: true } },
      },
    });

    const payload = roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      builtin: r.builtin,
      description: r.description ?? null,
      permissionKeys: r.permissions.map((p) => p.permission.key),
      permissionNames: r.permissions.map((p) => p.permission.name),
      members: r._count.memberships,
    }));

    return ok(payload);
  }
);

// POST /api/admin/roles  (role.manage)
export const POST = withTenantPermission(
  "role.manage",
  async (req, { db, tenantId, session }) => {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }
    const { name, key, description, permissionKeys } = parsed.data;

    // Disallow using reserved built-in keys (defense-in-depth)
    const reserved = new Set(["OWNER", "ADMIN", "EDITOR", "READONLY"]);
    if (reserved.has(key.toUpperCase())) {
      return error(409, "CONFLICT", "Key collides with a built-in role");
    }

    // Resolve permissions by key
    const perms = await db.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true },
    });
    if (perms.length !== permissionKeys.length) {
      const found = new Set(perms.map((p) => p.key));
      const missing = permissionKeys.filter((k) => !found.has(k));
      return error(400, "BAD_REQUEST", `Unknown permission keys: ${missing.join(", ")}`);
    }

    try {
      const created = await db.role.create({
        data: {
          tenantId,
          key,
          name,
          builtin: false,
          description: description ?? null,
          permissions: {
            create: perms.map((p) => ({ permissionId: p.id })),
          },
        },
        include: {
          permissions: { select: { permission: { select: { key: true } } } },
        },
      });

      await audit(db, tenantId, session.user.id, "role.create", {
        roleId: created.id,
        key,
        name,
        permissionKeys,
      });

      return ok(
        {
          id: created.id,
          key: created.key,
          name: created.name,
          builtin: created.builtin,
          description: created.description,
          permissionKeys: created.permissions.map((p) => p.permission.key),
        },
        { status: 201 }
      );
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return error(409, "CONFLICT", "A role with this key already exists in this tenant");
      }
      console.error("[roles.POST] error", e);
      return error(500, "SERVER_ERROR", "Failed to create role");
    }
  }
);
