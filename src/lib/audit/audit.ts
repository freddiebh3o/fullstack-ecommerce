// src/lib/audit/audit.ts
import type { Prisma } from "@prisma/client";

/**
 * Narrow shape we need from a Prisma-like client:
 * anything that exposes auditLog.create(...)
 */
type AuditClientLike = {
  auditLog: {
    create: (args: Prisma.AuditLogCreateArgs) => Promise<unknown>;
  };
};

/**
 * Lightweight, safe audit helper.
 * Skips write when tenantId or userId is missing to avoid FK errors in dev.
 */
export async function audit(
  db: AuditClientLike,
  tenantId: string | null | undefined,
  userId: string | null | undefined,
  action: string,
  meta?: unknown
) {
  if (!tenantId || !userId) {
    // In dev, it's common to lack a proper session.user.id mapping.
    // Skip audit rather than error; keep a breadcrumb in the console.
    console.warn("[audit skipped] missing tenantId/userId", { tenantId, userId, action });
    return;
  }

  try {
    await db.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        // If your schema uses JSON, Prisma.InputJsonValue is ideal; cast keeps it flexible here.
        meta: meta as any,
      },
    });
  } catch (e) {
    // Never block the request because of audit; just warn.
    console.warn("[audit failed]", e);
  }
}
