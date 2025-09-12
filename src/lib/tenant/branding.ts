// src/lib/tenant/branding.ts
import "server-only";
import { db } from "@/lib/db/prisma";
import { getCurrentTenantId } from "@/lib/tenant/resolve";
import { audit } from "@/lib/audit/audit";
import { DEFAULT_THEME, type BrandingTheme, type ThemePalette } from "@/lib/branding/defaults";
import { coerceTheme, deepMerge } from "@/lib/branding/utils";

/** ---------- Partials used by PATCH/PUT merging ---------- */
export type ThemePalettePartial = Partial<{
  colors: Partial<ThemePalette["colors"]>;
  typography: Partial<ThemePalette["typography"]> & {
    fontSize?: Partial<ThemePalette["typography"]["fontSize"]>;
    fontWeight?: Partial<ThemePalette["typography"]["fontWeight"]>;
    lineHeight?: Partial<ThemePalette["typography"]["lineHeight"]>;
  };
  spacing: Partial<ThemePalette["spacing"]>;
  radii: Partial<ThemePalette["radii"]>;
  shadows: Partial<ThemePalette["shadows"]>;
  breakpoints: Partial<ThemePalette["breakpoints"]>;
}>;

export type BrandingPatch = Partial<{
  logoUrl: string | null;
  light: ThemePalettePartial;
  dark: ThemePalettePartial;
}>;

/**
 * Load current tenant’s branding theme (or the given tenant).
 * Always returns a fully-hydrated BrandingTheme (defaults merged).
 * NOTE: Prefer using getBrandingForTenant(tenantId) from /lib/branding/get-branding
 *       in pages; this remains for convenience in server-only contexts.
 */
export async function getTenantBranding(tenantId?: string): Promise<BrandingTheme> {
  const tid = tenantId ?? (await getCurrentTenantId());
  if (!tid) return DEFAULT_THEME;

  const row = await db.tenantBranding.findUnique({
    where: { tenantId: tid },
    select: { theme: true, logoUrl: true },
  });

  if (!row) return DEFAULT_THEME;

  const theme = coerceTheme(row.theme ?? DEFAULT_THEME);

  // Keep DB.logoUrl as fallback for legacy rows
  if (!theme.logoUrl && row.logoUrl) {
    theme.logoUrl = row.logoUrl;
  }

  return theme;
}

/**
 * Merge a partial patch into the tenant’s theme JSON.
 * Accepts any subset of { logoUrl, light{...}, dark{...} } and persists.
 */
export async function upsertTenantBranding(
  tenantId: string,
  userId: string,
  patch: BrandingPatch
) {
  const existing = await db.tenantBranding.findUnique({
    where: { tenantId },
    select: { theme: true, logoUrl: true },
  });

  const current = existing ? coerceTheme(existing.theme ?? DEFAULT_THEME) : DEFAULT_THEME;

  // Merge the patch into the current theme (rich shape).
  const nextLight = patch.light
    ? deepMerge<ThemePalette>(current.light, patch.light as Partial<ThemePalette>)
    : current.light;

  const nextDark = patch.dark
    ? deepMerge<ThemePalette>(current.dark, patch.dark as Partial<ThemePalette>)
    : current.dark;

  const next: BrandingTheme = {
    logoUrl: patch.logoUrl !== undefined ? patch.logoUrl : current.logoUrl,
    light: nextLight,
    dark: nextDark,
  };

  // Persist JSON (and keep logoUrl column in sync for legacy reads)
  const row = existing
    ? await db.tenantBranding.update({
        where: { tenantId },
        data: { theme: next as any, logoUrl: next.logoUrl },
      })
    : await db.tenantBranding.create({
        data: { tenantId, theme: next as any, logoUrl: next.logoUrl },
      });

  await audit(db, tenantId, userId, "branding.upsert", { changed: patch });
  return row;
}
