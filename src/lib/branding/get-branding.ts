// src/lib/branding/get-branding.ts
import { __rawDb } from "@/lib/db/prisma";
import { prismaForTenant } from "@/lib/db/tenant-extends";
import { DEFAULT_THEME, type BrandingTheme } from "./defaults";
import { coerceTheme } from "./utils";

export async function getBrandingForTenant(tenantId: string): Promise<BrandingTheme> {
  const tdb = prismaForTenant(__rawDb, tenantId);
  const rec = await tdb.tenantBranding.findFirst({
    select: { theme: true, logoUrl: true },
  });

  if (!rec) return DEFAULT_THEME;

  const coerced = coerceTheme(rec.theme ?? DEFAULT_THEME);
  if (!coerced.logoUrl && rec.logoUrl) coerced.logoUrl = rec.logoUrl;
  return coerced;
}
