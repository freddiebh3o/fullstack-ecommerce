import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { s3 } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import crypto from "node:crypto";

const bodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  byteLength: z.number().int().positive().max(10 * 1024 * 1024), // 10 MB
  scope: z.enum(["products", "categories", "brands"]),
  entityId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { filename, contentType, scope, entityId } = parsed.data;

  // sanitize extension
  const ext = (filename.split(".").pop() || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const key = `${scope}/${entityId}/${crypto.randomUUID()}.${ext}`;

  const bucket = process.env.S3_BUCKET_NAME!;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    // If you skipped the public-read bucket policy, omit this
    // and use presigned GET for viewing instead.
    ACL: "public-read",
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  // public URL (works because you set a public-read bucket policy in LocalStack)
  const publicBase =
    process.env.S3_PUBLIC_BASE ?? `http://localhost:4566/${bucket}`;
  // localstack path-style: include bucket in the path
  const publicUrl = `${publicBase}/${bucket}/${key}`
    .replace(/\/{2,}/g, "/")
    .replace(":/", "://");

  return NextResponse.json({ uploadUrl, key, publicUrl }, { status: 200 });
}
