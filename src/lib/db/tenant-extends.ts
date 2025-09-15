// src/lib/db/tenant-extends.ts
import type { PrismaClient } from "@prisma/client";
import { TENANT_SCOPED } from "./tenant-scoped";

/**
 * Env flag:
 *  - "inject" (default): covert risky ops (findUnique/update/delete) into safe tenant-scoped equivalents
 *  - "strict": throw on risky ops so callers must use safe patterns
 */
type Mode = "inject" | "strict";
const MODE: Mode = (process.env.TENANT_ENFORCEMENT_MODE as Mode) ?? "inject";

function normalizeUniqueWhere(unique: any) {
  // If the unique selector is composite like { tenantId_userId: { tenantId, userId } }
  // flatten it to a normal where { tenantId, userId } for findFirst.
  if (!unique || typeof unique !== "object") return unique;
  const keys = Object.keys(unique);
  if (keys.length === 1) {
    const k = keys[0];
    const v = unique[k];
    if (v && typeof v === "object") {
      return { ...v }; // flatten
    }
  }
  return unique; // simple unique like { id: '...' } stays as-is
}

function pickReturnFields(args: any) {
  if (args?.include) return { include: args.include };
  if (args?.select)  return { select: args.select };
  return {};
}

const addTenantToWhere = (where: any, tenantId: string) =>
  where ? { AND: [{ tenantId }, where] } : { tenantId };

const ensureDataTenant = (data: any, tenantId: string) => {
  if (!data) return { tenantId };
  if ("tenantId" in data && data.tenantId !== tenantId) {
    throw new Error("Cross-tenant write blocked (mismatched tenantId)");
  }
  return { ...data, tenantId };
};

export function prismaForTenant(base: PrismaClient, tenantId: string): PrismaClient {
  return base.$extends({
    name: "tenant-scope",
    // Enforce scoping on every delegate method we care about
    query: {
      $allModels: {
        /* ---------- READS ---------- */
        async findMany({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            args = args ?? {};
            args.where = addTenantToWhere(args.where, tenantId);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            args = args ?? {};
            args.where = addTenantToWhere(args.where, tenantId);
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            args = args ?? {};
            args.where = addTenantToWhere(args.where, tenantId);
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            args = args ?? {};
            args.where = addTenantToWhere(args.where, tenantId);
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            args = args ?? {};
            args.where = addTenantToWhere(args.where, tenantId);
          }
          return query(args);
        },

        /* ---------- CREATES ---------- */
        async create({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            args = args ?? {};
            args.data = ensureDataTenant(args.data, tenantId);
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            const rows = Array.isArray(args?.data) ? args.data : [args?.data];
            args = args ?? {};
            args.data = rows.map((r) => ensureDataTenant(r, tenantId));
          }
          return query(args);
        },

        /* ---------- UPDATES/DELETES (guard unique-id ops) ---------- */
        async update({ model, args, query }) {
          if (!TENANT_SCOPED.has(model)) return query(args);

          // Prisma .update requires a unique 'where' (cannot AND tenantId).
          // We emulate safely via updateMany + fetch.
          if (!args?.where) throw new Error("Update requires a `where`");
          const unique = args.where;

          const { count } = await (base as any)[model].updateMany({
            where: addTenantToWhere(unique, tenantId),
            data: args.data,
          });
          if (count === 0) {
            // Mirror Prisma's not-found behaviour
            throw Object.assign(new Error(`${model}.update: record not found for tenant`), {
              code: "P2025",
            });
          }
          // Return the updated record (first match under tenant)
          return (base as any)[model].findFirst({
            where: addTenantToWhere(unique, tenantId),
          });
        },

        async updateMany({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            args = args ?? {};
            args.where = addTenantToWhere(args.where, tenantId);
          }
          return query(args);
        },

        async delete({ model, args, query }) {
          if (!TENANT_SCOPED.has(model)) return query(args);
          if (!args?.where) throw new Error("Delete requires a `where`");
          const unique = args.where;

          // Fetch first under tenant to return after deletion
          const existing = await (base as any)[model].findFirst({
            where: addTenantToWhere(unique, tenantId),
          });
          if (!existing) {
            throw Object.assign(new Error(`${model}.delete: record not found for tenant`), {
              code: "P2025",
            });
          }
          const { count } = await (base as any)[model].deleteMany({
            where: addTenantToWhere(unique, tenantId),
          });
          if (count === 0) {
            throw Object.assign(new Error(`${model}.delete: record not found for tenant`), {
              code: "P2025",
            });
          }
          return existing;
        },

        async deleteMany({ model, args, query }) {
          if (TENANT_SCOPED.has(model)) {
            args = args ?? {};
            args.where = addTenantToWhere(args.where, tenantId);
          }
          return query(args);
        },

        async upsert({ model, args, query }) {
          if (!TENANT_SCOPED.has(model)) return query(args);
          if (!args?.where) throw new Error("Upsert requires a `where`");
        
          const whereForLookup = addTenantToWhere(
            normalizeUniqueWhere(args.where),
            tenantId
          );
        
          const found = await (base as any)[model].findFirst({ where: whereForLookup });
        
          if (found) {
            return (base as any)[model].update({
              where: { id: found.id },
              data: args.update ?? {},
              ...pickReturnFields(args),          // <-- preserve include/select
            });
          }
        
          return (base as any)[model].create({
            data: ensureDataTenant(args.create, tenantId),
            ...pickReturnFields(args),            // <-- preserve include/select
          });
        },

        /* ---------- RISKY FINDS ---------- */
        async findUnique({ model, args, query }) {
          if (!TENANT_SCOPED.has(model)) return query(args);
          if (MODE === "strict") {
            throw new Error(
              `findUnique on tenant-scoped model "${model}" is blocked; use findFirst/findMany (tenant-scoped) instead.`
            );
          }
          // inject mode: convert to tenant-scoped findFirst on base (bypasses recursion)
          return (base as any)[model].findFirst({
            where: addTenantToWhere(args?.where, tenantId),
          });
        },
        async findUniqueOrThrow(ctx) {
          // Delegate to our findUnique behavior and throw if null
          const res = await (this as any).findUnique(ctx);
          if (!res) {
            throw Object.assign(new Error("Record not found for tenant"), { code: "P2025" });
          }
          return res;
        },
      },
    },

    /* ---------- Convenience sugar available on all models ---------- */
    model: {
      $allModels: {
        async byId(this: any, id: string) {
          const model = this.name as string;
          if (!TENANT_SCOPED.has(model)) {
            // Non-tenant models can use the normal unique lookup
            return this.findUnique({ where: { id } });
          }
          // Tenant-scoped safe lookup
          return (base as any)[model].findFirst({
            where: { id, tenantId },
          });
        },
      },
    },
  }) as unknown as PrismaClient; // satisfies callers typed as PrismaClient
}
