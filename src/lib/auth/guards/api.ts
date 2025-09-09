// src/lib/auth/guards/api.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { tenantDb } from "@/lib/db/tenant-db";
import { can } from "@/lib/auth/permissions";
import type { Session } from "next-auth";
import type { PrismaClient } from "@prisma/client";

type CtxBase = { params?: unknown };
export type GuardedCtx = CtxBase & {
  session: Session;
  db: PrismaClient;
  tenantId: string;
};

type Handler = (req: Request, ctx: GuardedCtx) => Promise<Response> | Response;

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

async function normalizeParams(maybe: unknown) {
  // If it quacks like a Promise, await it.
  if (maybe && typeof (maybe as any).then === "function") {
    return await (maybe as Promise<any>);
  }
  return maybe;
}

/** Require a single tenant permission before running the handler */
export function withTenantPermission(permissionKey: string, handler: Handler) {
  return async (req: Request, ctx?: CtxBase) => {
    const session = await getServerSession(authOptions);
    if (!session) return json(401, { error: "Unauthorized" });

    const { db, tenantId } = await tenantDb();
    console.log("tenantId1234", tenantId);
    console.log("permissionKey1234", permissionKey);

    const allowed = await can(permissionKey, tenantId);
    console.log("allowed1234", allowed);
    if (!allowed) return json(403, { error: "Forbidden" });

    const params = await normalizeParams(ctx?.params);

    try {
      return await handler(req, { ...(ctx ?? {}), params, session, db, tenantId });
    } catch (err) {
      console.error(`[route error] ${permissionKey}`, err);
      return json(500, { error: "Internal Server Error" });
    }
  };
}

/** Allow any of the provided permissions */
export function withAnyTenantPermission(permissionKeys: string[], handler: Handler) {
  return async (req: Request, ctx?: CtxBase) => {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { db, tenantId } = await tenantDb();

    let allowed = false;
    for (const key of permissionKeys) {
      if (await can(key, tenantId)) { allowed = true; break; }
    }
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const params = await normalizeParams(ctx?.params);

    return handler(req, { ...(ctx ?? {}), params, session, db, tenantId });
  };
}
