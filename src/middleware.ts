import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware strategy:
 * - Gate /admin to *authenticated* users (any system role).
 * - Do NOT enforce RBAC here (Edge middleware can't hit the DB reliably).
 * - RBAC & tenant scoping are enforced in server components and API routes via `can()` + tenant checks.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard the admin app (leave public & auth endpoints alone)
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Read the NextAuth JWT at the edge
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated → send to login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated → allow. (RBAC/tenant checks happen server-side & in API routes)
  return NextResponse.next();
}

// Match the admin app only
export const config = {
  matcher: ["/admin/:path*"],
};
