// src/lib/branding/css-vars.ts
import type { ThemeBundle, ThemePalette } from "./defaults";

/** Flatten a palette to CSS variables */
function paletteToVars(p: ThemePalette) {
  return [
    `--color-primary:${p.primary}`,
    `--color-primary-hover:${p.primaryHover}`,

    `--color-bg:${p.background}`,
    `--color-surface:${p.surface}`,
    `--color-text:${p.text}`,
    `--color-text-muted:${p.textMuted}`,
    `--color-border:${p.border}`,

    `--color-success:${p.success}`,
    `--color-warning:${p.warning}`,
    `--color-error:${p.error}`,

    // optional extras (use defaults if undefined)
    `--color-ring:${p.ring ?? p.primary}`,
    `--color-sidebar:${p.sidebar ?? p.surface}`,
    `--color-card:${p.card ?? p.surface}`,
  ].join(";");
}

/**
 * Produce CSS that scopes vars to the admin app container.
 * We scope at [data-admin] so it doesn’t leak to the storefront.
 */
export function themeToScopedCss(theme: ThemeBundle) {
  const lightVars = paletteToVars(theme.light);
  const darkVars  = paletteToVars(theme.dark);

  return `
    /* tenant branding (injected) */
    [data-admin]{${lightVars}}
    .dark [data-admin]{${darkVars}}
    `;
}
