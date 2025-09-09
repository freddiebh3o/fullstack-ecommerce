// src/app/actions/is-system-admin.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";

export async function isSystemAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  return role === "ADMIN" || role === "SUPERADMIN";
}
