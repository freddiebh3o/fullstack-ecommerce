// src/app/api/admin/brands/[id]/route.ts
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
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const data = parsed.data;
  const normalizedSlug = slugify(data.slug);

  // proactive unique check
  const conflict = await db.brand.findFirst({
    where: { slug: normalizedSlug, NOT: { id } },
    select: { id: true },
  });
  if (conflict) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });

  try {
    const updated = await db.brand.update({
      where: { id },
      data: {
        name: data.name.trim(),
        slug: normalizedSlug,
        description: data.description || null,
        websiteUrl: data.websiteUrl || null,
        logoUrl: data.logoUrl || null,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  // block delete if in use
  const count = await db.product.count({ where: { brandId: id } });
  if (count > 0) {
    return NextResponse.json({ error: "Cannot delete brand in use" }, { status: 400 });
  }

  await db.brand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
