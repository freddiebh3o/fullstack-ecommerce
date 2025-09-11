// src/lib/branding/defaults.ts
export type ThemePalette = {
  // core brand
  primary: string;
  primaryHover: string;

  // surfaces & text
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;

  // semantic
  success: string;
  warning: string;
  error: string;

  // optional extras used by components
  ring?: string;
  sidebar?: string;
  card?: string;
};

export type ThemeBundle = {
  metaVersion: 1;
  light: ThemePalette;
  dark: ThemePalette;
  logoUrl?: string | null;
};

/**
 * Blue-ish defaults (Tailwind-ish blues + slate neutrals).
 * Kept minimal on purpose — these are the tokens actually consumed
 * by css-vars.ts → admin-theme.css in the admin shell.
 */
export const DEFAULT_THEME: ThemeBundle = {
  metaVersion: 1,
  light: {
    primary: "#3B82F6",       // blue-500
    primaryHover: "#2563EB",  // blue-600

    background: "#F8FAFC",    // slate-50
    surface: "#FFFFFF",
    text: "#0F172A",          // slate-900
    textMuted: "#64748B",     // slate-500
    border: "#E2E8F0",        // slate-200

    success: "#16A34A",       // green-600
    warning: "#D97706",       // amber-600
    error:   "#DC2626",       // red-600

    ring: "#2563EB",
    sidebar: "#FFFFFF",
    card: "#FFFFFF",
  },
  dark: {
    primary: "#60A5FA",       // blue-400
    primaryHover: "#3B82F6",  // blue-500

    background: "#0B1220",    // deep navy
    surface: "#0F172A",       // slate-900
    text: "#E5E7EB",          // slate-200
    textMuted: "#9CA3AF",     // slate-400
    border: "#1F2937",        // slate-800

    success: "#22C55E",       // green-500
    warning: "#F59E0B",       // amber-500
    error:   "#F87171",       // red-400

    ring: "#60A5FA",
    sidebar: "#0F172A",
    card: "#0F172A",
  },
  logoUrl: null,
};
