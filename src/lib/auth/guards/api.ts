// src/lib/auth/guards/api.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import type { PrismaClient } from "@prisma/client";

import { authOptions } from "@/lib/auth/nextauth";
import { tenantDb } from "@/lib/db/tenant-db";
import { can } from "@/lib/auth/permissions";
import { error } from "@/lib/api/response";

type CtxBase = { params?: unknown };

export type GuardedCtx = CtxBase & {
  session: Session;
  db: PrismaClient;
  tenantId: string;
};

type Handler = (req: Request, ctx: GuardedCtx) => Promise<Response> | Response;

/* -------------------------
   Small helpers
-------------------------- */

function withHeader(res: NextResponse, key: string, value: string) {
  res.headers.set(key, value);
  return res;
}

function unauthorized() {
  // Standardize JSON + header for client redirect logic
  return withHeader(
    error(401, "UNAUTHENTICATED", "You must be signed in"),
    "x-deny-reason",
    "unauthorized"
  );
}

function forbiddenResponse(message = "Insufficient permissions") {
  return withHeader(
    error(403, "FORBIDDEN", message),
    "x-deny-reason",
    "forbidden"
  );
}

async function normalizeParams(maybe: unknown) {
  // If it quacks like a Promise, await it (Next 15 can pass params as a Promise)
  if (maybe && typeof (maybe as any).then === "function") {
    return await (maybe as Promise<any>);
  }
  return maybe;
}

/* -------------------------
   Core guards
-------------------------- */

/**
 * Require a session + tenant context, no specific permission.
 * Useful for endpoints that are tenant-scoped but open to any
 * authenticated user in that tenant.
 */
export function withTenant(handler: Handler) {
  return async (req: Request, ctx?: CtxBase) => {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorized();

    const { db, tenantId } = await tenantDb();
    const params = await normalizeParams(ctx?.params);

    try {
      return await handler(req, { ...(ctx ?? {}), params, session, db, tenantId });
    } catch (err) {
      console.error(`[route error]`, err);
      return error(500, "SERVER_ERROR", "Internal Server Error");
    }
  };
}

/** Require a single tenant permission before running the handler */
export function withTenantPermission(permissionKey: string, handler: Handler) {
  return async (req: Request, ctx?: CtxBase) => {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorized();

    const { db, tenantId } = await tenantDb();

    const allowed = await can(permissionKey, tenantId);
    if (!allowed) return forbiddenResponse();

    const params = await normalizeParams(ctx?.params);

    try {
      return await handler(req, { ...(ctx ?? {}), params, session, db, tenantId });
    } catch (err) {
      console.error(`[route error] ${permissionKey}`, err);
      return error(500, "SERVER_ERROR", "Internal Server Error");
    }
  };
}

/** Allow any of the provided permissions (OR semantics) */
export function withAnyTenantPermission(permissionKeys: string[], handler: Handler) {
  return async (req: Request, ctx?: CtxBase) => {
    const session = await getServerSession(authOptions);
    if (!session) return unauthorized();

    const { db, tenantId } = await tenantDb();

    let allowed = false;
    for (const key of permissionKeys) {
      // short-circuit on first allowed
      if (await can(key, tenantId)) { allowed = true; break; }
    }
    if (!allowed) return forbiddenResponse();

    const params = await normalizeParams(ctx?.params);

    try {
      return await handler(req, { ...(ctx ?? {}), params, session, db, tenantId });
    } catch (err) {
      console.error(`[route error any(${permissionKeys.join(",")})]`, err);
      return error(500, "SERVER_ERROR", "Internal Server Error");
    }
  };
}

/**
 * Lower-level utility in case you need fine-grained control.
 * Returns either a populated context or a 401 response.
 */
type RequireApiSessionResult =
  | { ok: true; session: Session; db: PrismaClient; tenantId: string; response: null }
  | { ok: false; response: NextResponse };

export async function requireApiSession(): Promise<RequireApiSessionResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { ok: false, response: unauthorized() };
  }

  const { db, tenantId } = await tenantDb();
  return { ok: true, session, db, tenantId, response: null };
}