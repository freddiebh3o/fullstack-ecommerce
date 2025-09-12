// src/lib/branding/css-vars.ts
// Generate scoped CSS variables for the Admin app from the rich BrandingTheme.
// Variables are scoped to [data-admin] so they don't leak to the storefront.

import type { BrandingTheme, ThemePalette } from "./defaults";

/** Flatten a rich palette (nested .colors) to CSS variables */
function paletteToVars(p: ThemePalette) {
  const c = p.colors;

  // Derivations / fallbacks for optional tokens
  const ring = c.primaryHover ?? c.primary;
  const sidebar = c.surface; // sensible default for sidebar bg
  const card = c.surface;

  // Header/table tokens already exist in the default; provide safe fallbacks
  const headerBg = c.headerBg ?? c.primary;
  const headerTitle = c.headerTitle ?? c.text; // overridden to white in light defaults
  const headerDesc = c.headerDesc ?? c.textMuted;

  const tableHeaderBg = c.tableHeaderBg ?? c.surface;
  const tableHeaderFg = c.tableHeaderFg ?? c.text;

  return [
    // Brand
    `--color-primary:${c.primary}`,
    `--color-primary-hover:${c.primaryHover}`,
    `--color-secondary:${c.secondary}`,
    `--color-secondary-hover:${c.secondaryHover}`,

    // Surfaces & text
    `--color-bg:${c.background}`,
    `--color-surface:${c.surface}`,
    `--color-text:${c.text}`,
    `--color-text-muted:${c.textMuted}`,
    `--color-border:${c.border}`,

    // Semantic
    `--color-success:${c.success}`,
    `--color-warning:${c.warning}`,
    `--color-error:${c.error}`,

    // Derived / component tokens
    `--color-ring:${ring}`,
    `--color-sidebar:${sidebar}`,
    `--color-card:${card}`,

    // Header & table (component-level)
    `--color-header-bg:${headerBg}`,
    `--color-header-title:${headerTitle}`,
    `--color-header-desc:${headerDesc}`,
    `--color-table-header-bg:${tableHeaderBg}`,
    `--color-table-header-fg:${tableHeaderFg}`,
  ].join(";");
}

/**
 * Produce CSS that scopes vars to the admin app container.
 * We scope at [data-admin] so it doesn’t leak to the storefront.
 */
export function themeToScopedCss(theme: BrandingTheme) {
  const lightVars = paletteToVars(theme.light);
  const darkVars = paletteToVars(theme.dark);

  return `
/* tenant branding (injected) */
[data-admin]{${lightVars}}
.dark [data-admin]{${darkVars}}
`;
}
