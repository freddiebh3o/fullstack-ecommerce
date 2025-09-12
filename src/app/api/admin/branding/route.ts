// src/app/api/admin/branding/route.ts
import { z } from "zod";
import { ok, error } from "@/lib/api/response";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { getCurrentTenantId } from "@/lib/tenant/resolve";
import { db } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/audit";

import { DEFAULT_THEME, type BrandingTheme, type ThemePalette } from "@/lib/branding/defaults";
import { coerceTheme, deepMerge } from "@/lib/branding/utils";
import { getBrandingForTenant } from "@/lib/branding/get-branding";

export const dynamic = "force-dynamic";

/** ---------- Permission helpers ---------- */
async function canReadBranding(tenantId: string, session: any) {
  const sys = (session?.user as any)?.role as "USER" | "ADMIN" | "SUPERADMIN" | undefined;
  if (sys === "ADMIN" || sys === "SUPERADMIN") return true;
  return (await can("branding.read", tenantId)) || (await can("branding.write", tenantId));
}

async function canWriteBranding(tenantId: string, session: any) {
  const sys = (session?.user as any)?.role as "USER" | "ADMIN" | "SUPERADMIN" | undefined;
  if (sys === "ADMIN" || sys === "SUPERADMIN") return true;
  return can("branding.write", tenantId);
}

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
export const GET = async () => {
  const session = await getServerSession(authOptions);
  if (!session) return error(401, "UNAUTHENTICATED", "You must be signed in");

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return error(400, "BAD_REQUEST", "No tenant selected");

  if (!(await canReadBranding(tenantId, session))) {
    return error(403, "FORBIDDEN", "Insufficient permissions");
  }

  const branding = await getBrandingForTenant(tenantId);
  return ok({
    light: branding.light,
    dark: branding.dark,
    logoUrl: branding.logoUrl ?? null,
  });
};

/** ---------- PUT: merge & persist normalized branding ---------- */
export const PUT = async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) return error(401, "UNAUTHENTICATED", "You must be signed in");

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return error(400, "BAD_REQUEST", "No tenant selected");

  if (!(await canWriteBranding(tenantId, session))) {
    return error(403, "FORBIDDEN", "Insufficient permissions");
  }

  const json = await req.json().catch(() => null);
  const parsed = PutSchema.safeParse(json);
  if (!parsed.success) {
    return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
  }
  const { light, dark, logoUrl } = parsed.data;

  // Load existing or start from canonical defaults, then normalize shape
  const existing = await db.tenantBranding.findUnique({
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
    logoUrl: logoUrl !== undefined ? logoUrl : current.logoUrl,
  };

  // Persist normalized JSON; keep column logoUrl in sync for legacy reads
  const updated = await db.tenantBranding.upsert({
    where: { tenantId },
    create: { tenantId, theme: next as any, logoUrl: next.logoUrl },
    update: { theme: next as any, ...(logoUrl !== undefined ? { logoUrl } : {}) },
    select: { theme: true, logoUrl: true, id: true },
  });

  await audit(db, tenantId, (session.user as any).id, "branding.update", {
    changed: {
      light: !!light,
      dark: !!dark,
      logoUrl: logoUrl !== undefined ? (logoUrl ?? null) : "unchanged",
    },
  });

  // Return normalized slices (avoid leaking unrelated JSON details)
  const result = coerceTheme(updated.theme ?? DEFAULT_THEME);
  return ok({
    light: result.light,
    dark: result.dark,
    logoUrl: result.logoUrl ?? null,
  });
};
