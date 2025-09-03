// /middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Read JWT from cookies using the same secret
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not logged in → go to /login and come back afterward
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in but not admin → show 403 page
  if ((token as any)?.role !== "ADMIN") {
    return NextResponse.rewrite(new URL("/403", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
