// src/app/api/admin/users/[id]/route.ts
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, error } from "@/lib/api-response";
import { withSystemRole ,SystemGuardCtx } from "@/lib/system-guard";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().optional(),
  role: z.enum(["ADMIN", "USER", "SUPERADMIN"]).optional(),
  password: z.string().min(8).optional(), // if provided, reset
});

async function ensureNotDemotingLastAdmin(targetUserId: string, newRole?: "ADMIN" | "USER" | "SUPERADMIN") {
  if (!newRole || newRole !== "USER") return;
  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
  if (!target || target.role !== "ADMIN") return;
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount <= 1) throw new Error("Cannot demote the last remaining system ADMIN");
}

async function ensureNotDeletingLastAdmin(targetUserId: string) {
  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
  if (!target || target.role !== "ADMIN") return;
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount <= 1) throw new Error("Cannot delete the last remaining system ADMIN");
}

// PATCH /api/admin/users/:id  (ADMIN | SUPERADMIN)
export const PATCH = withSystemRole(["ADMIN", "SUPERADMIN"], async (req, ctx: SystemGuardCtx) => {
  const { session } = ctx;
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop() || "";
  const parsedParams = paramsSchema.safeParse({ id });
  if (!parsedParams.success) return error(400, "BAD_REQUEST", "Invalid id");

  const parsedBody = patchSchema.safeParse(await req.json());
  if (!parsedBody.success) return error(400, "VALIDATION", "Invalid request body", parsedBody.error.flatten());

  const { email, name, role, password } = parsedBody.data;

  try {
    if (role) await ensureNotDemotingLastAdmin(id, role);

    const data: any = {};
    if (email) data.email = email.toLowerCase();
    if (typeof name !== "undefined") data.name = name === "" ? null : name;
    if (role) data.role = role;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.update({ where: { id }, data });
    return ok(user);
  } catch (e: any) {
    if (e.message?.includes("last remaining system ADMIN")) {
      return error(400, "BAD_REQUEST", e.message);
    }
    if ((e as Prisma.PrismaClientKnownRequestError).code === "P2002") {
      return error(409, "CONFLICT", "Email already exists");
    }
    if ((e as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return error(404, "NOT_FOUND", "Not found");
    }
    throw e;
  }
});

// DELETE /api/admin/users/:id  (ADMIN | SUPERADMIN)
export const DELETE = withSystemRole(["ADMIN", "SUPERADMIN"], async (req, ctx: SystemGuardCtx) => {
  const { session } = ctx;
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop() || "";
  const parsedParams = paramsSchema.safeParse({ id });
  if (!parsedParams.success) return error(400, "BAD_REQUEST", "Invalid id");

  // don't let users delete themselves
  if ((session?.user as any)?.id === id) {
    return error(400, "BAD_REQUEST", "You cannot delete your own account");
  }

  try {
    await ensureNotDeletingLastAdmin(id);
    await db.user.delete({ where: { id } });
    return ok({ id, deleted: true });
  } catch (e: any) {
    if (e.message?.includes("last remaining system ADMIN")) {
      return error(400, "BAD_REQUEST", e.message);
    }
    if ((e as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return error(404, "NOT_FOUND", "Not found");
    }
    throw e;
  }
});
