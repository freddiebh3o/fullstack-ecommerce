// src/app/api/admin/branding/route.ts
import { z } from "zod";
import { ok, error } from "@/lib/api/response";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { getCurrentTenantId } from "@/lib/tenant/resolve";
import { db } from "@/lib/db/prisma";
import { can } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/audit";
import { getBrandingForTenant } from "@/lib/branding/get-branding";

// Optional: mark dynamic so Next won't try to cache at build
export const dynamic = "force-dynamic";

/**
 * Very small deep-merge utility for plain objects.
 * - arrays are replaced (not concatenated)
 * - only merges objects; primitives/arrays overwrite
 */
function deepMerge<T extends Record<string, any>, U extends Record<string, any>>(target: T, src: U): T & U {
  const out: any = { ...target };
  for (const [k, v] of Object.entries(src ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v as any);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Theme partial schema — flexible but typed */
const ThemePartialSchema = z
  .object({
    colors: z.record(z.string(), z.string()).optional(), // keys: string, values: string
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

/**
 * GET /api/admin/branding
 * Returns: { light, dark, logoUrl }
 */
export const GET = async () => {
  const session = await getServerSession(authOptions);
  if (!session) return error(401, "UNAUTHENTICATED", "You must be signed in");

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return error(400, "BAD_REQUEST", "No tenant selected");

  if (!(await canReadBranding(tenantId, session))) {
    return error(403, "FORBIDDEN", "Insufficient permissions");
  }

  // Use your helper that already falls back to defaults if needed
  const branding = await getBrandingForTenant(tenantId);
  return ok({
    light: branding.light,
    dark: branding.dark,
    logoUrl: branding.logoUrl ?? null,
  });
};

/**
 * PUT /api/admin/branding
 * Body: { light?: ThemePartial, dark?: ThemePartial, logoUrl?: string|null }
 * Merges partial into stored JSON. Creates row if missing.
 */
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

  // Fetch existing or default
  const existing = await db.tenantBranding.findUnique({
    where: { tenantId },
    select: { id: true, theme: true, logoUrl: true },
  });

  // Build the new theme object
  // If nothing exists, seed with empty buckets; "getBrandingForTenant" handles runtime defaults anyway,
  // but we keep structure tidy in DB.
  const currentTheme =
    (existing?.theme as any) ??
    {
      metaVersion: 1,
      light: {},
      dark: {},
    };

  let newTheme = currentTheme;
  if (light) newTheme = deepMerge(newTheme, { light });
  if (dark) newTheme = deepMerge(newTheme, { dark });

  // Upsert branding row
  const updated = await db.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      theme: newTheme,
      logoUrl: logoUrl !== undefined ? logoUrl : existing?.logoUrl ?? null,
    },
    update: {
      theme: newTheme,
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    },
    select: { theme: true, logoUrl: true, id: true },
  });

  // Audit
  await audit(db, tenantId, (session.user as any).id, "branding.update", {
    changed: {
      light: !!light,
      dark: !!dark,
      logoUrl: logoUrl !== undefined ? (logoUrl ?? null) : "unchanged",
    },
  });

  return ok({
    light: (updated.theme as any)?.light ?? {},
    dark: (updated.theme as any)?.dark ?? {},
    logoUrl: updated.logoUrl ?? null,
  });
};
