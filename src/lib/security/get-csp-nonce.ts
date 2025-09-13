// src/lib/security/get-csp-nonce.ts

import { headers } from "next/headers";

export async function getCspNonce(): Promise<string | null> {
  // Available in Server Components / layouts
  return (await headers()).get("x-nonce");
}
