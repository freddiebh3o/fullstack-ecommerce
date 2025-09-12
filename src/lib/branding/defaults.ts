// src/lib/branding/defaults.ts
// Canonical rich BrandingTheme (single source of truth)
// Softer, blue-forward defaults with calmer contrast.

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
    // header / section tokens
    | "headerBg"
    | "headerTitle"
    | "headerDesc"
    // table header tokens
    | "tableHeaderBg"
    | "tableHeaderFg"
    // optional extras (derived or direct)
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
  metaVersion: number;
  light: ThemePalette;
  dark: ThemePalette;
  logoUrl: string | null;
};

// ---------------------------------------------
// Softer, blue-forward LIGHT palette
// ---------------------------------------------
const LIGHT: ThemePalette = {
  colors: {
    // Primary blues: softer chroma, gentle hover
    // (approx: #3B82F6 → #2F6FE0 range, but a touch calmer)
    primary: "#8AB4F8",        // gentle blue
    primaryHover: "#7AA2E8",   // slightly deeper on hover

    // Secondary: cool teal accent, subdued
    secondary: "#3FB7C7",
    secondaryHover: "#35A5B4",

    // Neutrals: softer background & surface, muted border
    background: "#F8FAFC",     // very soft off-white/blue tint
    surface: "#FFFFFF",
    text: "#111827",           // slate-900-ish
    textMuted: "#6B7280",      // slate-500-ish
    border: "#E5EAF0",         // softer than slate-200

    // Semantic: dialed down saturation a hair
    success: "#25B26A",
    warning: "#D68A16",
    error:   "#E35858",

    // Section headers (cards, panels): blue bg with white text
    headerBg: "#8AB4F8",       // between primary & hover for body headers
    headerTitle: "#FFFFFF",
    headerDesc: "#EAF2FF",     // faint bluish white for description

    // Table headers: airy, slightly tinted row header
    tableHeaderBg: "#F0F5FB",
    tableHeaderFg: "#111827",

    // Optional extras (used by CSS vars generator)
    ring: "#3A7CDD",
    sidebar: "#FFFFFF",
    card: "#FFFFFF",
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: { xs: "12px", sm: "14px", base: "16px", lg: "18px", xl: "20px", "2xl": "24px" },
    fontWeight: { light: 300, normal: 400, medium: 500, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.7 },
  },
  spacing: { none: "0px", xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", "2xl": "48px" },
  radii: { none: "0px", sm: "6px", md: "10px", lg: "16px", full: "9999px" },
  shadows: {
    sm: "0 1px 2px rgba(16,24,40,0.04)",
    md: "0 4px 10px rgba(16,24,40,0.07)",
    lg: "0 12px 24px rgba(16,24,40,0.08)",
  },
  breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
};

// ---------------------------------------------
// Softer, balanced DARK palette
// ---------------------------------------------
const DARK: ThemePalette = {
  colors: {
    // Primary blues: keep pop but avoid neon
    primary: "#7FAEF7",
    primaryHover: "#6B9DEA",

    // Secondary: teal accent softened
    secondary: "#58C6D3",
    secondaryHover: "#45B2BF",

    // Neutrals: deep slate/navy tones but not pitch black
    background: "#0F1320",
    surface: "#141A28",
    text: "#E6E9EF",
    textMuted: "#9AA3B2",
    border: "#2A3442",

    // Semantic with moderated saturation
    success: "#49D889",
    warning: "#F0B24A",
    error:   "#F07171",

    // Section headers (cards, panels): deeper blue with white text
    headerBg: "#345FAF",
    headerTitle: "#FFFFFF",
    headerDesc: "#DCE8FF",

    // Table headers: darker neutral band with clear text
    tableHeaderBg: "#1A2233",
    tableHeaderFg: "#E6E9EF",

    // Optional extras
    ring: "#6B9DEA",
    sidebar: "#101726",
    card: "#141A28",
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: { xs: "12px", sm: "14px", base: "16px", lg: "18px", xl: "20px", "2xl": "24px" },
    fontWeight: { light: 300, normal: 400, medium: 500, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.7 },
  },
  spacing: { none: "0px", xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", "2xl": "48px" },
  radii: { none: "0px", sm: "6px", md: "10px", lg: "16px", full: "9999px" },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.35)",
    md: "0 4px 10px rgba(0,0,0,0.40)",
    lg: "0 12px 24px rgba(0,0,0,0.48)",
  },
  breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
};

export const DEFAULT_THEME: BrandingTheme = {
  metaVersion: 2, // bump so you can detect default set changes if you ever migrate
  light: LIGHT,
  dark: DARK,
  logoUrl: null,
};
