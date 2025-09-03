// src/app/api/admin/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/slug";

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const name = parsed.data.name.trim();
  const normalizedSlug = slugify(parsed.data.slug);

  // Proactive conflict check (exclude current row)
  const conflict = await db.category.findFirst({
    where: { slug: normalizedSlug, NOT: { id } },
    select: { id: true },
  });
  if (conflict) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  try {
    const updated = await db.category.update({
      where: { id },
      data: { name, slug: normalizedSlug },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    // Double safety in case of race
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db.category.delete({ where: { id } });
  } catch (e: any) {
    return NextResponse.json({ error: "Cannot delete category in use" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
