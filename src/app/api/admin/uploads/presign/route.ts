// src/app/api/admin/uploads/presign/route.ts
import { NextResponse } from "next/server";
import { s3 } from "@/lib/storage/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import crypto from "node:crypto";
import { error } from "@/lib/api/response";
import { withTenantPermission } from "@/lib/auth/guards/api";

const bodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  byteLength: z.number().int().positive().max(10 * 1024 * 1024), // 10 MB
  scope: z.enum(["products", "categories", "brands", "branding"]),
  entityId: z.string().min(1),
});

export const POST = withTenantPermission("branding.write", async (req, { tenantId }) => {

  const raw = await req.json();
  const normalized = {
    filename: raw.filename ?? raw.fileName,
    contentType: raw.contentType ?? raw.fileType,
    byteLength: raw.byteLength ?? raw.fileSize,
    scope: raw.scope,
    entityId: raw.entityId,
  };

  const parsed = bodySchema.safeParse(normalized);
  if (!parsed.success) return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());

  const { filename, contentType, scope, entityId } = parsed.data;

  // sanitize extension
  const ext = (filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");

  const basePath =
    scope === "branding"
      ? `tenants/${tenantId}/branding/${entityId}`
      : `tenants/${tenantId}/${scope}/${entityId}`;

  const key = `${basePath}/${crypto.randomUUID()}.${ext}`;

  const bucket =
    process.env.S3_BUCKET ||
    process.env.S3_BUCKET_NAME ||
    "ecom-dev-bucket"; // fallback to keep dev smooth

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 });

  const publicBase =
    process.env.S3_PUBLIC_BASE ?? "http://s3.localhost.localstack.cloud:4566";
  const publicUrl = `${publicBase}/${bucket}/${key}`
    .replace(/\/{2,}/g, "/")
    .replace(":/", "://");

  return NextResponse.json({ url, method: "PUT", headers: {}, key, publicUrl }, { status: 200 });
});
