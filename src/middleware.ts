// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logSecurityConfigOnce } from "@/lib/security/config";
import { applySecurityHeaders, buildCsp } from "@/lib/security/headers";

logSecurityConfigOnce();

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/auth", // NextAuth routes
]);

function isPublicPath(pathname: string) {
  if (pathname === "/") return false;
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|txt|map)$/)
  ) {
    return true;
  }
  return false;
}

// Edge-safe nonce (no Node 'crypto' or Buffer)
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // standard base64 is fine for CSP 'nonce-<value>'
  return btoa(s);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ── 1) Prepare per-request nonce + inject into *request headers* ───────────
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", buildCsp(nonce));

  const isAdminScope = pathname.startsWith("/admin");
  const isPublic = isPublicPath(pathname);

  // ── 2) For non-admin or public, pass through but keep the request headers ───
  if (!isAdminScope || isPublic) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    return applySecurityHeaders(res, nonce);
  }

  // ── 3) Admin auth checks (same logic as before) ────────────────────────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const callbackUrl = pathname + (search || "");
  const hasSessionCookie =
    req.cookies.has("__Secure-next-auth.session-token") ||
    req.cookies.has("next-auth.session-token");
  const hadAuthCookie = req.cookies.get("x-had-auth")?.value === "1";

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", callbackUrl);
    url.searchParams.set("reason", hasSessionCookie || hadAuthCookie ? "expired" : "unauthenticated");
    const redir = NextResponse.redirect(url);
    return applySecurityHeaders(redir, nonce);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = (token as any).exp as number | undefined;
  if (typeof exp === "number" && exp <= nowSec) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", callbackUrl);
    url.searchParams.set("reason", "expired");
    const redir = NextResponse.redirect(url);
    return applySecurityHeaders(redir, nonce);
  }

  // ── 4) Allow request to continue with nonce-bearing headers ────────────────
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(res, nonce);
}

// Run CSP middleware on all pages (not just /admin), but *auth* only guards /admin.
export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};