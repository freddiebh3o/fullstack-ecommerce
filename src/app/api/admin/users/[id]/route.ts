import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().optional(),
  role: z.enum(["ADMIN", "USER", "SUPERADMIN"]).optional(),
  password: z.string().min(8).optional(), // if provided, reset
});

async function ensureNotDemotingLastAdmin(targetUserId: string, newRole?: "ADMIN" | "USER" | "SUPERADMIN") {
  // Only applies when demoting an ADMIN to USER (or to SUPERADMIN? no, SUPERADMIN is higher)
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const sysRole = (session?.user as any)?.role;
  if (sysRole !== "ADMIN" && sysRole !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { id } = parsedParams.data;

  const parsedBody = patchSchema.safeParse(await req.json());
  if (!parsedBody.success) return NextResponse.json(parsedBody.error.flatten(), { status: 400 });
  const { email, name, role, password } = parsedBody.data;

  try {
    if (role) await ensureNotDemotingLastAdmin(id, role);

    const data: any = {};
    if (email) data.email = email.toLowerCase();
    if (typeof name !== "undefined") data.name = name === "" ? null : name;
    if (role) data.role = role;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.update({ where: { id }, data });
    return NextResponse.json(user, { status: 200 });
  } catch (e: any) {
    if (e.message?.includes("last remaining system ADMIN")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const sysRole = (session?.user as any)?.role;
  if (sysRole !== "ADMIN" && sysRole !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { id } = parsedParams.data;

  // don't let users delete themselves
  if ((session?.user as any)?.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  try {
    await ensureNotDeletingLastAdmin(id);
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message?.includes("last remaining system ADMIN")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}
