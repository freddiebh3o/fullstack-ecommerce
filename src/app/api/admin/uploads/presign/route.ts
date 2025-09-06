// src/app/api/admin/uploads/presign/route.ts
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

  // Accept both camelCase and snake-ish aliases from the client
  const raw = await req.json();
  const normalized = {
    filename: raw.filename ?? raw.fileName,
    contentType: raw.contentType ?? raw.fileType,
    byteLength: raw.byteLength ?? raw.fileSize,
    scope: raw.scope,
    entityId: raw.entityId,
  };

  const parsed = bodySchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.flatten(), { status: 400 });
  }

  const { filename, contentType, scope, entityId } = parsed.data;

  // Sanitize file extension
  const ext = (filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `${scope}/${entityId}/${crypto.randomUUID()}.${ext}`;

  const bucket = process.env.S3_BUCKET_NAME!;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    // Public-read works because you've set a permissive bucket policy in LocalStack
    ACL: "public-read",
  });

  // Presigned PUT URL for direct upload
  const url = await getSignedUrl(s3, command, { expiresIn: 60 });

  // Public URL to view the file after upload
  // Prefer virtual-hosted style for LocalStack: http://s3.localhost.localstack.cloud:4566/<bucket>/<key>
  const publicBase =
    process.env.S3_PUBLIC_BASE ?? "http://s3.localhost.localstack.cloud:4566";
  const publicUrl = `${publicBase}/${bucket}/${key}`
    .replace(/\/{2,}/g, "/")
    .replace(":/", "://");

  // Return the shape expected by the client uploader
  return NextResponse.json(
    {
      url,               // presigned upload URL
      method: "PUT",     // client uses PUT by default
      headers: {},       // you can add custom headers if needed
      key,               // (optional) S3 key
      publicUrl,         // final public URL to store in DB
    },
    { status: 200 }
  );
}
