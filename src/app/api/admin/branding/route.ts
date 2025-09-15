// src/app/api/admin/branding/route.ts
import { z } from "zod";
import { ok, error } from "@/lib/api/response";
import { audit } from "@/lib/audit/audit";
import { withAnyTenantPermission, withTenantPermission } from "@/lib/auth/guards/api";

import { DEFAULT_THEME, type BrandingTheme, type ThemePalette } from "@/lib/branding/defaults";
import { coerceTheme, deepMerge } from "@/lib/branding/utils";
import { getBrandingForTenant } from "@/lib/branding/get-branding";

export const dynamic = "force-dynamic";

/** ---------- Validation (rich, partial) ---------- */
const ThemePartialSchema = z
  .object({
    colors: z.record(z.string(), z.string()).optional(),
    typography: z
      .object({
        fontFamily: z.string().optional(),
        fontSize: z.record(z.string(), z.string()).optional(),
        fontWeight: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
        lineHeight: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
      })
      .partial()
      .optional(),
    spacing: z.record(z.string(), z.string()).optional(),
    radii: z.record(z.string(), z.string()).optional(),
    shadows: z.record(z.string(), z.string()).optional(),
    breakpoints: z.record(z.string(), z.string()).optional(),
  })
  .partial();

const PutSchema = z
  .object({
    light: ThemePartialSchema.optional(),
    dark: ThemePartialSchema.optional(),
    logoUrl: z.string().url().nullable().optional(),
  })
  .refine((v) => v.light || v.dark || "logoUrl" in v, {
    message: "Provide at least one of: light, dark, logoUrl",
    path: [],
  });

/** ---------- GET: read normalized branding ---------- */
/** Requires branding.read OR branding.write */
export const GET = withAnyTenantPermission(
  ["branding.read", "branding.write"],
  async (_req, { tenantId }) => {
    const branding = await getBrandingForTenant(tenantId);
    return ok({
      light: branding.light,
      dark: branding.dark,
      logoUrl: branding.logoUrl ?? null,
    });
  }
);

/** ---------- PUT: merge & persist normalized branding ---------- */
/** Requires branding.write */
export const PUT = withTenantPermission(
  "branding.write",
  async (req, { db, tenantId, session }) => {
    const json = await req.json().catch(() => null);
    const parsed = PutSchema.safeParse(json);
    if (!parsed.success) {
      return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }
    const { light, dark, logoUrl } = parsed.data;

    // Load existing or start from canonical defaults, then normalize shape
    const existing = await db.tenantBranding.findFirst({
      where: { tenantId },
      select: { theme: true, logoUrl: true },
    });

    const current: BrandingTheme = existing
      ? coerceTheme(existing.theme ?? DEFAULT_THEME)
      : DEFAULT_THEME;

    // Build next (rich) by deep-merging partials
    const nextLight: ThemePalette =
      light ? deepMerge<ThemePalette>(current.light, light as Partial<ThemePalette>) : current.light;

    const nextDark: ThemePalette =
      dark ? deepMerge<ThemePalette>(current.dark, dark as Partial<ThemePalette>) : current.dark;

    const next: BrandingTheme = {
      light: nextLight,
      dark: nextDark,
      logoUrl: logoUrl !== undefined ? logoUrl : current.logoUrl ?? null,
      metaVersion: current.metaVersion ?? DEFAULT_THEME.metaVersion,
    };

    // Persist normalized JSON; keep column logoUrl in sync for legacy reads
    const updated = await db.tenantBranding.upsert({
      where: { tenantId },
      create: { tenantId, theme: next as any, logoUrl: next.logoUrl },
      update: { theme: next as any, ...(logoUrl !== undefined ? { logoUrl } : {}) },
      select: { theme: true, logoUrl: true, id: true },
    });

    // Minimal diffs for audit payload (colors diff as example)
    function diffObj<T extends Record<string, any>>(before: T, after: T) {
      const out: Record<string, { before: any; after: any }> = {};
      const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
      for (const k of keys) {
        if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) {
          out[k] = { before: before?.[k], after: after?.[k] };
        }
      }
      return out;
    }

    const lightDiff = light
      ? {
          colors: light.colors ? diffObj(current.light.colors, nextLight.colors) : undefined,
        }
      : undefined;

    const darkDiff = dark
      ? {
          colors: dark.colors ? diffObj(current.dark.colors, nextDark.colors) : undefined,
        }
      : undefined;

    await audit(db, tenantId, (session.user as any).id, "branding.update", {
      changes: {
        logoUrl:
          logoUrl !== undefined
            ? { before: current.logoUrl ?? null, after: next.logoUrl ?? null }
            : undefined,
        light: lightDiff,
        dark: darkDiff,
      },
    });

    // Return normalized slices (avoid leaking unrelated JSON details)
    const result = coerceTheme(updated.theme ?? DEFAULT_THEME);
    return ok({
      light: result.light,
      dark: result.dark,
      logoUrl: result.logoUrl ?? null,
    });
  }
);
