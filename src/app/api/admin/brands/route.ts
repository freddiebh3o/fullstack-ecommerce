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
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const data = parsed.data;
  try {
    const brand = await db.brand.create({
      data: {
        name: data.name.trim(),
        slug: slugify(data.slug),
        description: data.description || null,
        websiteUrl: data.websiteUrl || null,
        logoUrl: data.logoUrl || null,
      },
    });
    return NextResponse.json(brand, {
      status: 201,
      headers: { Location: `/admin/brands/${brand.id}/edit` },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    throw e;
  }
}
