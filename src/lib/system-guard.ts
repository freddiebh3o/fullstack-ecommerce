// src/lib/system-guard.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { error } from "@/lib/api-response";

/**
 * API route guard for system-level roles (no tenant context).
 * Usage: export const POST = withSystemRole(["ADMIN","SUPERADMIN"], async (req, { db, session }) => { ... })
 */
export function withSystemRole<R extends (req: Request, ctx: { db: typeof db; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> }) => Promise<Response> | Response>(
  roles: Array<"ADMIN" | "SUPERADMIN">,
  handler: R
) {
  return async function (req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return error(401, "UNAUTHENTICATED", "You must be signed in");
    const sysRole = (session.user as any)?.role as "ADMIN" | "SUPERADMIN" | "USER" | undefined;
    if (!sysRole || !roles.includes(sysRole)) {
      return error(403, "FORBIDDEN", "You do not have access to this resource");
    }
    return handler(req, { db, session });
  };
}

/**
 * Page guard for system-level roles (server components).
 * Returns { allowed, reason?, session }.
 */
export async function ensureSystemRole(roles: Array<"ADMIN" | "SUPERADMIN">) {
  const session = await getServerSession(authOptions);
  if (!session) return { allowed: false as const, reason: "unauthenticated" as const, session: null as any };
  const sysRole = (session.user as any)?.role as "ADMIN" | "SUPERADMIN" | "USER" | undefined;
  if (!sysRole || !roles.includes(sysRole)) {
    return { allowed: false as const, reason: "forbidden" as const, session };
  }
  return { allowed: true as const, session };
}
