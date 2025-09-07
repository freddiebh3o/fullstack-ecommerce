// src/lib/tenant-db.ts
import { db } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

type TenantModels = "Category" | "Brand" | "Product" | "ProductImage";

/**
 * Get a Prisma client that automatically scopes reads/writes to the current tenant.
 * - findMany/findFirst/count: adds where.tenantId
 * - create/createMany: injects data.tenantId
 * - update/delete: verifies the target row belongs to tenant (404 if not)
 */
export async function getTenantDb() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    const err: any = new Error("No tenant selected");
    err.status = 400;
    throw err;
  }

  const isTenantModel = (model: string): model is TenantModels =>
    ["Category", "Brand", "Product", "ProductImage"].includes(model);

  async function assertRowInTenant(model: TenantModels, where: any) {
    const id = typeof where === "string" ? where : where?.id;
    if (!id) return; // unsupported unique shape; skip (or tighten to throw)
    const row = await (db as any)[model].findUnique({
      where: { id },
      select: { tenantId: true },
    });
    if (!row || row.tenantId !== tenantId) {
      const err: any = new Error("Not found");
      err.status = 404;
      throw err;
    }
  }

  const tdb = db.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isTenantModel(model)) {
            const a: any = args ?? {};
            a.where = { ...(a.where ?? {}), tenantId };
            return query(a);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isTenantModel(model)) {
            const a: any = args ?? {};
            a.where = { ...(a.where ?? {}), tenantId };
            return query(a);
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (isTenantModel(model)) {
            const a: any = args ?? {};
            a.where = { ...(a.where ?? {}), tenantId };
            return query(a);
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (isTenantModel(model)) {
            const a: any = args ?? { data: {} };
            a.data = { ...(a.data ?? {}), tenantId };
            return query(a);
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (isTenantModel(model)) {
            const a: any = args ?? {};
            if (Array.isArray(a.data)) {
              a.data = a.data.map((d: any) => ({ ...d, tenantId }));
            } else if (a.data) {
              a.data = { ...a.data, tenantId };
            }
            return query(a);
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (isTenantModel(model)) {
            await assertRowInTenant(model, (args as any)?.where);
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (isTenantModel(model)) {
            await assertRowInTenant(model, (args as any)?.where);
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (isTenantModel(model)) {
            const a: any = args ?? {};
            a.where = { ...(a.where ?? {}), tenantId };
            return query(a);
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (isTenantModel(model)) {
            const a: any = args ?? {};
            a.where = { ...(a.where ?? {}), tenantId };
            return query(a);
          }
          return query(args);
        },
      },
    },
  });

  return tdb;
}

export async function getTenantDbCtx() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("No tenant");
  // If you have a $extends-scoped client, you can return it here; otherwise return db.
  // e.g., const scoped = db.$extends({ /* your scoping logic */ });
  const scoped = db;
  return { db: scoped, tenantId };
}