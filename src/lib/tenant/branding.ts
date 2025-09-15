// src/lib/tenant/branding.ts
import "server-only";
import { __rawDb } from "@/lib/db/prisma";
import { prismaForTenant } from "@/lib/db/tenant-extends";
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

  const tdb = prismaForTenant(__rawDb, tid);
  const row = await tdb.tenantBranding.findFirst({
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
  const tdb = prismaForTenant(__rawDb, tenantId);

  const existing = await tdb.tenantBranding.findFirst({
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
    metaVersion: current.metaVersion ?? DEFAULT_THEME.metaVersion,
    logoUrl: patch.logoUrl !== undefined ? patch.logoUrl : current.logoUrl,
    light: nextLight,
    dark: nextDark,
  };

  // Prefer upsert keyed on tenantId; include tenantId in create to satisfy TS
  const row = await tdb.tenantBranding.upsert({
    where: { tenantId }, // assumes a unique constraint on tenantId
    update: { theme: next as any, logoUrl: next.logoUrl },
    create: { tenantId, theme: next as any, logoUrl: next.logoUrl },
    select: { theme: true, logoUrl: true },
  });

  await audit(tdb, tenantId, userId, "branding.upsert", { changed: patch });
  return row;
}
