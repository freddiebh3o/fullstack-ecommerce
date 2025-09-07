// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().trim().optional(),
  role: z.enum(["ADMIN", "USER", "SUPERADMIN"]).optional().default("USER"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const sysRole = (session?.user as any)?.role; 
  if (sysRole !== "ADMIN" && sysRole !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { email, name, role, password } = parsed.data;

  try {
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name: name?.trim() || null,
        role,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    return NextResponse.json(user, {
      status: 201,
      headers: { Location: `/admin/users/${user.id}/edit` },
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    throw e;
  }
}
