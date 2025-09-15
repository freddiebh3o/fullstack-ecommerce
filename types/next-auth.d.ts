// types/next-auth.d.ts
import { DefaultUser } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role?: "USER" | "SUPERUSER";
    };
    currentTenantId?: string;
  }

  interface User extends DefaultUser {
    role: "USER" | "SUPERUSER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "SUPERUSER";
    sub?: string;
    currentTenantId?: string;
  }
}
