// src/lib/audit.ts
export async function audit(
  db: any,
  tenantId: string,
  userId: string,
  action: string,
  meta?: any
) {
  try {
    await db.auditLog.create({ data: { tenantId, userId, action, meta } });
  } catch (e) {
    console.warn("[audit failed]", e);
  }
}
