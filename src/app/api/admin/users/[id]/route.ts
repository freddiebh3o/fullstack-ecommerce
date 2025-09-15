// src/app/api/admin/users/[id]/route.ts
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { ok, error } from "@/lib/api/response";
import { withSystemRole ,SystemGuardCtx } from "@/lib/auth/guards/system";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().optional(),
  role: z.enum(["USER", "SUPERUSER"]).optional(),
  password: z.string().min(8).optional(), // if provided, reset
});

async function ensureNotDemotingLastSuperuser(targetUserId: string, newRole?: "USER" | "SUPERUSER") {
  if (!newRole || newRole !== "USER") return;
  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
  if (!target || target.role !== "SUPERUSER") return;
  const count = await db.user.count({ where: { role: "SUPERUSER" } });
  if (count <= 1) throw new Error("Cannot demote the last remaining SUPERUSER");
}

async function ensureNotDeletingLastSuperuser(targetUserId: string) {
  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } });
  if (!target || target.role !== "SUPERUSER") return;
  const count = await db.user.count({ where: { role: "SUPERUSER" } });
  if (count <= 1) throw new Error("Cannot delete the last remaining SUPERUSER");
}

export const PATCH = withSystemRole(["SUPERUSER"], async (req, ctx: SystemGuardCtx) => {
  const { session } = ctx;
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop() || "";
  const parsedParams = paramsSchema.safeParse({ id });
  if (!parsedParams.success) return error(400, "BAD_REQUEST", "Invalid id");

  const parsedBody = patchSchema.safeParse(await req.json());
  if (!parsedBody.success) return error(400, "VALIDATION", "Invalid request body", parsedBody.error.flatten());

  const { email, name, role, password } = parsedBody.data;

  try {
    if (role) await ensureNotDemotingLastSuperuser(id, role);

    const data: any = {};
    if (email) data.email = email.toLowerCase();
    if (typeof name !== "undefined") data.name = name === "" ? null : name;
    if (role) data.role = role;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.update({ where: { id }, data });
    return ok(user);
  } catch (e: any) {
    if (e.message?.includes("last remaining SUPERUSER")) {
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

export const DELETE = withSystemRole(["SUPERUSER"], async (req, ctx: SystemGuardCtx) => {
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
    await ensureNotDeletingLastSuperuser(id);
    await db.user.delete({ where: { id } });
    return ok({ id, deleted: true });
  } catch (e: any) {
    if (e.message?.includes("last remaining SUPERUSER")) {
      return error(400, "BAD_REQUEST", e.message);
    }
    if ((e as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      return error(404, "NOT_FOUND", "Not found");
    }
    throw e;
  }
});
