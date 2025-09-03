import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: Request) {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/admin")) return NextResponse.next();

  const token = await getToken({
    req: req as any,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const role = (token as any)?.role;
  if (role !== "ADMIN") {
    const redirect = new URL("/login", url);
    redirect.searchParams.set("redirect", url.pathname);
    return NextResponse.redirect(redirect);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
