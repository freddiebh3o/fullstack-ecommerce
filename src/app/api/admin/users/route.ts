// src/app/api/admin/users/route.ts
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { ok, error } from "@/lib/api/response";
import { withSystemRole } from "@/lib/auth/guards/system";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().trim().optional(),
  role: z.enum(["USER", "SUPERUSER"]).optional().default("USER"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/admin/users  (SUPERUSER)
export const POST = withSystemRole(["SUPERUSER"], async (req) => {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());

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

    return ok(user, {
      status: 201,
      headers: { Location: `/admin/users/${user.id}/edit` },
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return error(409, "CONFLICT", "Email already exists");
    }
    throw e;
  }
});
