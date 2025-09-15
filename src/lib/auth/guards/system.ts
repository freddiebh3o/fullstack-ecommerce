// src/lib/auth/guards/system.ts
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { db } from "@/lib/db/prisma";
import { error } from "@/lib/api/response";

export type SystemRole = "USER" | "SUPERUSER";

export type SystemGuardCtx = {
  db: typeof db;
  session: Session;
};

export function withSystemRole(
  roles: Array<Extract<SystemRole, "SUPERUSER">>,
  handler: (req: Request, ctx: SystemGuardCtx) => Promise<Response> | Response
) {
  return async function (req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return error(401, "UNAUTHENTICATED", "You must be signed in");
    const sysRole = (session.user as any)?.role as SystemRole | undefined;
    if (!sysRole || !roles.includes(sysRole as any)) {
      return error(403, "FORBIDDEN", "You do not have access to this resource");
    }
    return handler(req, { db, session });
  };
}

export async function ensureSystemRole(roles: Array<Extract<SystemRole, "SUPERUSER">>) {
  const session = await getServerSession(authOptions);
  if (!session) return { allowed: false as const, reason: "unauthenticated" as const, session: null as any };
  const sysRole = (session.user as any)?.role as SystemRole | undefined;
  if (!sysRole || !roles.includes(sysRole as any)) {
    return { allowed: false as const, reason: "forbidden" as const, session };
  }
  return { allowed: true as const, session };
}
