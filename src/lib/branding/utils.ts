// src/lib/branding/utils.ts
// Central utilities for branding: object checks, deep merge, and theme coercion.

import { DEFAULT_THEME, type BrandingTheme, type ThemePalette } from "./defaults";

/** Narrow object check (non-array) */
export function isObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Deep merge for plain objects.
 * - Arrays are REPLACED, not concatenated.
 * - Only merges objects; primitives/arrays overwrite.
 * - `patch` keys with `undefined` are ignored.
 */
export function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (!isObject(base) || !isObject(patch)) return (patch ?? base) as T;

  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };

  for (const [k, v] of Object.entries(patch as any)) {
    if (v === undefined) continue;

    const current = out[k];

    if (isObject(current) && isObject(v)) {
      out[k] = deepMerge(current, v);
      continue;
    }

    // Replace arrays & primitives
    out[k] = v;
  }

  return out as T;
}

/**
 * Ensure arbitrary JSON resembles a full BrandingTheme.
 * - Merges provided light/dark palettes over DEFAULT_THEME palettes.
 * - Preserves DEFAULT_THEME where fields are missing.
 * - Handles legacy shapes gracefully.
 */
export function coerceTheme(json: any, defaults: BrandingTheme = DEFAULT_THEME): BrandingTheme {
  if (!json || !isObject(json)) return defaults;

  const light = deepMerge<ThemePalette>(defaults.light, (json as any).light ?? {});
  const dark  = deepMerge<ThemePalette>(defaults.dark,  (json as any).dark  ?? {});

  const logoUrl =
    (json as any).logoUrl !== undefined
      ? (json as any).logoUrl
      : (defaults.logoUrl ?? null);

  return { light, dark, logoUrl };
}
