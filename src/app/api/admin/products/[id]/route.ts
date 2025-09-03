import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  categorySlug: z.string().optional().or(z.literal("")),
});

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolved = await params; // 👈 await the params
  const parsed = paramsSchema.safeParse(resolved);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { id } = parsed.data;

  try {
    await db.$transaction([
      db.productImage.deleteMany({ where: { productId: id } }),
      db.product.delete({ where: { id } }),
    ]);
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }
  const data = parsed.data;

  // Ensure slug is unique (exclude current product)
  const slugCollision = await db.product.findFirst({
    where: { slug: data.slug, NOT: { id } },
    select: { id: true },
  });
  if (slugCollision) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  // Resolve category
  let categoryId: string | null = null;
  if (data.categorySlug) {
    const cat = await db.category.findUnique({ where: { slug: data.categorySlug } });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    categoryId = cat.id;
  }

  // Update product
  const updated = await db.product.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      priceCents: data.priceCents,
      currency: data.currency,
      description: data.description || null,
      categoryId,
    },
    include: { images: true, category: true },
  });

  // Replace or set primary image if provided
  if (typeof data.imageUrl === "string") {
    const primary = updated.images.sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (data.imageUrl === "") {
      // Clear images if blank string sent
      await db.productImage.deleteMany({ where: { productId: id } });
    } else if (primary) {
      await db.productImage.update({
        where: { id: primary.id },
        data: { url: data.imageUrl, alt: updated.name, sortOrder: 0 },
      });
    } else {
      await db.productImage.create({
        data: { productId: id, url: data.imageUrl, alt: updated.name, sortOrder: 0 },
      });
    }
  }

  const result = await db.product.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });

  return NextResponse.json(result, { status: 200 });
}
