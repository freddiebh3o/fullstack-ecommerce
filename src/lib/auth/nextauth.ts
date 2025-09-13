// src/lib/auth/nextauth.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/prisma";
import { ENV } from "@/lib/utils/env";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { 
    strategy: "jwt", 
    updateAge: ENV.AUTH_SESSION_UPDATE_AGE_SECONDS,
    maxAge: ENV.AUTH_SESSION_MAX_AGE_SECONDS,
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = (creds?.email as string | undefined)?.toLowerCase();
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role } as User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
  
      // set currentTenantId once (first membership or the "default" tenant)
      if (!token.currentTenantId && token.sub) {
        const membership = await db.membership.findFirst({
          where: { userId: token.sub },
          select: { tenantId: true },
          orderBy: { createdAt: "asc" },
        });
        token.currentTenantId =
          membership?.tenantId ||
          (await db.tenant.findFirst({ where: { slug: "default" }, select: { id: true } }))?.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = (token as any).role;
        (session.user as any).id = token.sub;
      }
      (session as any).currentTenantId = (token as any).currentTenantId;
      return session;
    },
  },
  pages: { signIn: "/login" },
  jwt: {
    maxAge: ENV.AUTH_SESSION_MAX_AGE_SECONDS,
  },
};

export default NextAuth(authOptions);
