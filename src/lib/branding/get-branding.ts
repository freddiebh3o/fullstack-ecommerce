// src/lib/branding/get-branding.ts
import { db } from "@/lib/db/prisma";
import { DEFAULT_THEME, type BrandingTheme } from "./defaults";
import { coerceTheme } from "./utils";

/**
 * Load branding JSON for a tenant. Falls back to DEFAULT_THEME if none exists.
 * Never throws — always returns a valid BrandingTheme (rich shape).
 */
export async function getBrandingForTenant(tenantId: string): Promise<BrandingTheme> {
  const rec = await db.tenantBranding.findUnique({
    where: { tenantId },
    select: { theme: true, logoUrl: true },
  });

  if (!rec) return DEFAULT_THEME;

  // Coerce stored JSON into the canonical shape and fill defaults.
  const coerced = coerceTheme(rec.theme ?? DEFAULT_THEME);

  // Prefer column logoUrl when JSON is missing it (legacy rows).
  if (!coerced.logoUrl && rec.logoUrl) {
    coerced.logoUrl = rec.logoUrl;
  }

  return coerced;
}
