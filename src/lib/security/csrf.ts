// src/lib/security/csrf.ts
// ✅ Edge-safe: uses Web Crypto (available in Next.js middleware)

import type { NextRequest, NextResponse } from "next/server";
import { DEV } from "@/lib/security/config";
import { ENABLE_CSRF } from "@/lib/security/config";

export const CSRF_COOKIE = "csrf";

// Base64-URL encode Uint8Array without Buffer (Edge-safe)
function base64url(u8: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  // btoa is available in Edge runtime
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function genCsrfToken(): string {
  const bytes = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export function setCsrfCookie(res: NextResponse, token: string) {
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,     // client must read it to echo in x-csrf-token
    sameSite: "lax",     // blocks most cross-site POSTs by default
    secure: !DEV,        // secure in prod
    path: "/",
    maxAge: 60 * 60 * 24 // 1 day
  });
}

/** Verify double-submit: header x-csrf-token must equal 'csrf' cookie. */
export function verifyCsrf(req: NextRequest):
  | { ok: true }
  | { ok: false; reason: "missing" | "mismatch" } {
  if (!ENABLE_CSRF) return { ok: true };
  const header = req.headers.get("x-csrf-token"); // case-insensitive
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  if (!header || !cookie) return { ok: false, reason: "missing" };
  return header === cookie ? { ok: true } : { ok: false, reason: "mismatch" };
}