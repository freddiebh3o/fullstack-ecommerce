// src/lib/branding/get-branding.ts
import { db } from "@/lib/db/prisma";
import { DEFAULT_THEME, type ThemeBundle } from "./defaults";

/**
 * Load branding JSON for a tenant. Falls back to DEFAULT_THEME if none exists.
 * Never throws — always returns a valid ThemeBundle.
 */
export async function getBrandingForTenant(tenantId: string): Promise<ThemeBundle> {
  const rec = await db.tenantBranding.findUnique({
    where: { tenantId },
    select: { theme: true, logoUrl: true },
  });

  if (!rec?.theme) return DEFAULT_THEME;

  // Merge stored theme with defaults to be resilient to older records
  const stored = rec.theme as Partial<ThemeBundle>;
  return {
    ...DEFAULT_THEME,
    ...stored,
    light: { ...DEFAULT_THEME.light, ...(stored.light ?? {}) },
    dark:  { ...DEFAULT_THEME.dark,  ...(stored.dark  ?? {}) },
    logoUrl: rec.logoUrl ?? stored.logoUrl ?? DEFAULT_THEME.logoUrl ?? null,
  } as ThemeBundle;
}
