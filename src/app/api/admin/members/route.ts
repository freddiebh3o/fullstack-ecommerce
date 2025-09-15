// src/app/api/admin/members/route.ts
import { z } from "zod";
import bcrypt from "bcryptjs";
import { ok, error } from "@/lib/api/response";
import { withAnyTenantPermission, withTenantPermission } from "@/lib/auth/guards/api";
import { audit } from "@/lib/audit/audit";

const postSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().optional(),
  roleKey: z.string().min(2),
  password: z.string().min(8).optional(),
});

// Helper: can the current user assign OWNER in this tenant?
async function canAssignOwner(db: any, tenantId: string, session: any) {
  const sysRole = (session?.user as any)?.role;
  if (sysRole === "SUPERUSER") return true;

  // must be OWNER of this tenant
  const me = await db.membership.findFirst({
    where: { tenantId, userId: session.user.id },
    select: { role: { select: { key: true } } },
  });
  return me?.role?.key === "OWNER";
}

// GET /api/admin/members  (member.read OR member.manage)
export const GET = withAnyTenantPermission(
  ["member.read", "member.manage"],
  async (_req, { db, tenantId }) => {
    const memberships = await db.membership.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, key: true, name: true } },
      },
    });
    return ok(memberships);
  }
);

// POST /api/admin/members  (member.manage)
export const POST = withTenantPermission(
  "member.manage",
  async (req, { db, tenantId, session }) => {
    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }
    const { email, name, roleKey, password } = parsed.data;

    // Enforce OWNER promotion rule
    if (roleKey === "OWNER") {
      const allowed = await canAssignOwner(db, tenantId, session);
      if (!allowed) {
        return error(403, "FORBIDDEN", "Only tenant owners or system administrators can assign owner.");
      }
    }

    // Resolve role within this tenant
    const role = await db.role.findFirst({
      where: { tenantId, key: roleKey },
      select: { id: true },
    });
    if (!role) return error(400, "BAD_REQUEST", "Role not found");

    // Create or find global user
    const lower = email.toLowerCase();
    const global = (await import("@/lib/db/prisma")).db; // use global prisma
    let user = await global.user.findUnique({ where: { email: lower } });
    if (!user) {
      const pw = password ?? "TempPass123!";
      user = await global.user.create({
        data: {
          email: lower,
          name: name ?? null,
          role: "USER", // system role
          passwordHash: await bcrypt.hash(pw, 10),
        },
      });
    }

    // Upsert membership (tenant scoped)
    const member = await db.membership.upsert({
      where: { tenantId_userId: { tenantId, userId: (user as any).id } },
      update: { roleId: role.id },
      create: { tenantId, userId: (user as any).id, roleId: role.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, key: true, name: true } },
      },
    });

    await audit(db, tenantId, session.user.id, "member.add", {
      membershipId: member.id,
      userId: member.user.id,
      roleKey,
    });

    return ok(member, { status: 201 });
  }
);
