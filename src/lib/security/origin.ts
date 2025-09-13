// src/lib/security/origin.ts
import type { NextRequest } from "next/server";
import { APP_ORIGIN, STRICT_REFERER } from "./config";

/** Parse a URL and return its origin, or null on failure. */
function toOrigin(u: string | null): string | null {
  if (!u) return null;
  try { return new URL(u).origin; } catch { return null; }
}

/** Require requests to come from APP_ORIGIN. Use Origin first; fallback to Referer. */
export function assertSameOrigin(req: NextRequest):
  | { ok: true }
  | { ok: false; reason: string } {
  const origin = req.headers.get("origin");
  if (origin) {
    return origin === APP_ORIGIN
      ? { ok: true }
      : { ok: false, reason: `bad-origin:${origin}` };
  }

  // Some form posts may omit Origin; fall back to a strict Referer check
  const referer = req.headers.get("referer");
  if (!referer) {
    return STRICT_REFERER ? { ok: false, reason: "no-origin-or-referer" } : { ok: true };
  }
  const refOrigin = toOrigin(referer);
  if (refOrigin === APP_ORIGIN && referer.startsWith(APP_ORIGIN + "/")) {
    return { ok: true };
  }
  return { ok: false, reason: `bad-referer:${referer}` };
}
