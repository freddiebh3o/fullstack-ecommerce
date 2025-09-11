// src/lib/tenant/branding.ts
import "server-only";
import { db } from "@/lib/db/prisma";
import { getCurrentTenantId } from "@/lib/tenant/resolve";
import { audit } from "@/lib/audit/audit";
import {
  DEFAULT_THEME as BASE_DEFAULT_THEME,
  type ThemePalette as BasePalette,
} from "@/lib/branding/defaults";

/** ---------- Extended (editor) types ---------- */

export type ThemePalette = {
  colors: Record<
    | "primary"
    | "primaryHover"
    | "secondary"
    | "secondaryHover"
    | "background"
    | "surface"
    | "text"
    | "textMuted"
    | "border"
    | "success"
    | "warning"
    | "error"
    | "ring"
    | "sidebar"
    | "card",
    string
  >;
  typography: {
    fontFamily: string;
    fontSize: Record<"xs" | "sm" | "base" | "lg" | "xl" | "2xl", string>;
    fontWeight: Record<"light" | "normal" | "medium" | "bold", number | string>;
    lineHeight: Record<"tight" | "normal" | "relaxed", number | string>;
  };
  spacing: Record<"none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl", string>;
  radii: Record<"none" | "sm" | "md" | "lg" | "full", string>;
  shadows: Record<"sm" | "md" | "lg", string>;
  breakpoints: Record<"sm" | "md" | "lg" | "xl", string>;
};

export type BrandingTheme = {
  light: ThemePalette;
  dark: ThemePalette;
  logoUrl: string | null;
};

// Partial for PATCH/PUT merging
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

/** ---------- utils ---------- */

function isObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (!isObject(base) || !isObject(patch)) return (patch ?? base) as T;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const [k, v] of Object.entries(patch as any)) {
    if (v === undefined) continue;
    if (isObject(v) && isObject(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out as T;
}

/** Map a minimal base palette → extended editor palette colors */
function baseToExtendedColors(base: BasePalette): ThemePalette["colors"] {
  return {
    primary: base.primary,
    primaryHover: base.primaryHover,
    // secondary tracks primary by default (editor can override)
    secondary: base.primary,
    secondaryHover: base.primaryHover,

    background: base.background,
    surface: base.surface,
    text: base.text,
    textMuted: base.textMuted,
    border: base.border,

    success: base.success,
    warning: base.warning,
    error: base.error,

    ring: base.ring ?? base.primary,
    sidebar: base.sidebar ?? base.surface,
    card: base.card ?? base.surface,
  };
}

/** Extended defaults that *derive colors* from the centralized base defaults */
const EXTENDED_DEFAULTS: BrandingTheme = {
  logoUrl: BASE_DEFAULT_THEME.logoUrl ?? null,
  light: {
    colors: baseToExtendedColors(BASE_DEFAULT_THEME.light),
    typography: {
      fontFamily: "'Inter', sans-serif",
      fontSize: { xs: "12px", sm: "14px", base: "16px", lg: "18px", xl: "20px", "2xl": "24px" },
      fontWeight: { light: 300, normal: 400, medium: 500, bold: 700 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 },
    },
    spacing: { none: "0px", xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", "2xl": "48px" },
    radii: { none: "0px", sm: "4px", md: "8px", lg: "16px", full: "9999px" },
    shadows: {
      sm: "0 1px 2px rgba(0,0,0,0.06)",
      md: "0 4px 10px rgba(0,0,0,0.08)",
      lg: "0 12px 24px rgba(0,0,0,0.12)",
    },
    breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
  },
  dark: {
    colors: baseToExtendedColors(BASE_DEFAULT_THEME.dark),
    typography: {
      fontFamily: "'Inter', sans-serif",
      fontSize: { xs: "12px", sm: "14px", base: "16px", lg: "18px", xl: "20px", "2xl": "24px" },
      fontWeight: { light: 300, normal: 400, medium: 500, bold: 700 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 },
    },
    spacing: { none: "0px", xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", "2xl": "48px" },
    radii: { none: "0px", sm: "4px", md: "8px", lg: "16px", full: "9999px" },
    shadows: {
      sm: "0 1px 2px rgba(0,0,0,0.35)",
      md: "0 4px 10px rgba(0,0,0,0.4)",
      lg: "0 12px 24px rgba(0,0,0,0.5)",
    },
    breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
  },
};

/**
 * Merge an incoming (possibly minimal) theme object into extended colors:
 * - supports both shapes:
 *   • minimal flat: { primary, background, ... }
 *   • extended: { colors: { primary, ... }, typography, ... }
 */
function mergeIntoExtended(target: ThemePalette, incoming: any): ThemePalette {
  if (!isObject(incoming)) return target;

  const out = { ...target };

  // If extended colors object present
  if (isObject(incoming.colors)) {
    out.colors = deepMerge(out.colors, incoming.colors);
  }

  // Also accept minimal flat keys directly on the palette
  const flatKeys: Array<keyof ThemePalette["colors"]> = [
    "primary", "primaryHover",
    "secondary", "secondaryHover",
    "background", "surface", "text", "textMuted", "border",
    "success", "warning", "error",
    "ring", "sidebar", "card",
  ];
  for (const k of flatKeys) {
    if (k in (incoming as any) && typeof (incoming as any)[k] === "string") {
      out.colors[k] = (incoming as any)[k];
    }
  }

  // Optional extended groups
  if (isObject(incoming.typography)) out.typography = deepMerge(out.typography, incoming.typography);
  if (isObject(incoming.spacing)) out.spacing = deepMerge(out.spacing, incoming.spacing);
  if (isObject(incoming.radii)) out.radii = deepMerge(out.radii, incoming.radii);
  if (isObject(incoming.shadows)) out.shadows = deepMerge(out.shadows, incoming.shadows);
  if (isObject(incoming.breakpoints)) out.breakpoints = deepMerge(out.breakpoints, incoming.breakpoints);

  return out;
}

/** Ensure we always return a fully-hydrated *extended* theme to the editor */
function coerceTheme(json: any): BrandingTheme {
  const base: BrandingTheme = JSON.parse(JSON.stringify(EXTENDED_DEFAULTS));
  if (!isObject(json)) return base;

  const lightIncoming = (json as any).light ?? {};
  const darkIncoming = (json as any).dark ?? {};

  base.light = mergeIntoExtended(base.light, lightIncoming);
  base.dark = mergeIntoExtended(base.dark, darkIncoming);

  // prefer column for logoUrl; keep JSON as fallback (will be overridden in getTenantBranding)
  const logoFromJson = (json as any).logoUrl ?? null;
  return { ...base, logoUrl: logoFromJson };
}

/** ---------- public API used by pages/UI ---------- */

/**
 * Load current tenant’s branding as *extended* theme for the editor UI.
 * Colors derive from centralized defaults; typography/etc. have sensible defaults.
 */
export async function getTenantBranding(tenantId?: string): Promise<BrandingTheme> {
  const tid = tenantId ?? (await getCurrentTenantId());
  if (!tid) return EXTENDED_DEFAULTS;

  const row = await db.tenantBranding.findUnique({
    where: { tenantId: tid },
    select: { theme: true, logoUrl: true },
  });

  if (!row) return EXTENDED_DEFAULTS;

  const extended = coerceTheme(row.theme);
  // Column logoUrl is canonical; fall back to any JSON value
  extended.logoUrl = row.logoUrl ?? extended.logoUrl ?? null;
  return extended;
}

/**
 * Merge a partial patch (extended) and persist.
 * We keep storing the JSON as-is (may include extended fields) for forward-compat.
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

  const current = existing ? coerceTheme(existing.theme) : EXTENDED_DEFAULTS;

  const nextLight =
    patch.light ? deepMerge<ThemePalette>(current.light, patch.light as Partial<ThemePalette>) : current.light;

  const nextDark =
    patch.dark ? deepMerge<ThemePalette>(current.dark, patch.dark as Partial<ThemePalette>) : current.dark;

  const next: BrandingTheme = {
    logoUrl: patch.logoUrl !== undefined ? patch.logoUrl : current.logoUrl,
    light: nextLight,
    dark: nextDark,
  };

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
