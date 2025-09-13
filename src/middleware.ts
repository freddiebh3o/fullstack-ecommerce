// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/auth", // NextAuth routes
]);

function isPublicPath(pathname: string) {
  if (pathname === "/") return false; // treat home as protected if your app requires auth
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Skip static assets and Next internals
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

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isAdminScope = pathname.startsWith("/admin");
  const isPublic = isPublicPath(pathname);

  // Only guard protected scopes (e.g., /admin)
  if (!isAdminScope) return NextResponse.next();

  // Avoid loops (login, next internals, assets)
  if (isPublic) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Build a clean callbackUrl preserving the original path+query
  const callbackUrl = pathname + (search || "");

  // Detect presence of a NextAuth session cookie (name differs between HTTP/HTTPS)
  const hasSessionCookie =
    req.cookies.has("__Secure-next-auth.session-token") ||
    req.cookies.has("next-auth.session-token");

  // Helper cookie we set on successful login from the login page
  const hadAuthCookie = req.cookies.get("x-had-auth")?.value === "1";

  // No (valid) token
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", callbackUrl);
    // If we ever had auth or still have a NextAuth session cookie, treat as expired
    url.searchParams.set("reason", hasSessionCookie || hadAuthCookie ? "expired" : "unauthenticated");
    return NextResponse.redirect(url);
  }

  // Token present: check exp to detect explicit timeout
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = (token as any).exp as number | undefined; // NextAuth sets exp in seconds
  if (typeof exp === "number" && exp <= nowSec) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", callbackUrl);
    url.searchParams.set("reason", "expired");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Limit middleware to admin area (and optionally API under admin if desired)
export const config = {
  matcher: ["/admin/:path*"],
};
