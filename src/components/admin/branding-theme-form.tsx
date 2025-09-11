// src/components/admin/branding-theme-form.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";

/* =========================
   Types (mirror API)
   ========================= */
type ThemePalette = {
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
    | "error",
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

type BrandingTheme = {
  light: ThemePalette;
  dark: ThemePalette;
  logoUrl: string | null;
};

type Props = {
  initial: BrandingTheme;
  canWrite: boolean;
};

// ---- Reasonable defaults (used by Reset to defaults) ----
const DEFAULTS: BrandingTheme = {
  light: {
    colors: {
      // Blue-forward
      primary: "#2563EB",        // blue-600
      primaryHover: "#1D4ED8",   // blue-700
      // Complementary accent (sky)
      secondary: "#0EA5E9",      // sky-500
      secondaryHover: "#0284C7", // sky-600

      // Neutrals
      background: "#F8FAFC",     // slate-50
      surface: "#FFFFFF",
      text: "#0F172A",           // slate-900
      textMuted: "#64748B",      // slate-500
      border: "#E2E8F0",         // slate-200

      // States
      success: "#16A34A",        // green-600
      warning: "#D97706",        // amber-600
      error: "#DC2626",          // red-600
    },
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
    colors: {
      primary: "#3B82F6",        // blue-500
      primaryHover: "#2563EB",   // blue-600
      secondary: "#38BDF8",      // sky-400
      secondaryHover: "#0EA5E9", // sky-500

      background: "#0B1220",     // deep navy
      surface: "#0F172A",        // slate-900
      text: "#E5E7EB",           // slate-200
      textMuted: "#9CA3AF",      // slate-400
      border: "#1F2937",         // slate-800

      success: "#22C55E",        // green-500
      warning: "#F59E0B",        // amber-500
      error:   "#F87171",        // red-400
    },
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
  logoUrl: null,
};


/* =========================
   Helpers
   ========================= */
function toCssVars(p: ThemePalette): React.CSSProperties {
  return {
    // colors
    ["--primary" as any]: p.colors.primary,
    ["--primary-hover" as any]: p.colors.primaryHover,
    ["--primary-foreground" as any]: p.colors.text,
    ["--secondary" as any]: p.colors.secondary,
    ["--secondary-hover" as any]: p.colors.secondaryHover,
    ["--secondary-foreground" as any]: p.colors.text,

    ["--background" as any]: p.colors.background,
    ["--card" as any]: p.colors.surface,
    ["--card-foreground" as any]: p.colors.text,
    ["--muted-foreground" as any]: p.colors.textMuted,
    ["--border" as any]: p.colors.border,
    ["--success" as any]: p.colors.success,
    ["--warning" as any]: p.colors.warning,
    ["--destructive" as any]: p.colors.error,
    ["--ring" as any]: p.colors.primaryHover,

    // ["--card-header-bg" as any]: p.colors.primary,
    // ["--card-header-fg" as any]: p.colors.text, // readable on top of primary

    // type
    ["--font-family" as any]: p.typography.fontFamily,
    ["--fs-base" as any]: p.typography.fontSize.base,
    ["--fs-sm" as any]: p.typography.fontSize.sm,
    ["--fs-lg" as any]: p.typography.fontSize.lg,
    ["--lh-normal" as any]: String(p.typography.lineHeight.normal),

    // radii & shadows
    ["--radius-md" as any]: p.radii.md,
    ["--shadow-sm" as any]: p.shadows.sm,
    ["--shadow-md" as any]: p.shadows.md,

    // type
    ["--font-family" as any]: p.typography.fontFamily,
    ["--fs-base" as any]: p.typography.fontSize.base,
    ["--fs-sm" as any]: p.typography.fontSize.sm,
    ["--fs-lg" as any]: p.typography.fontSize.lg,
    ["--lh-normal" as any]: String(p.typography.lineHeight.normal),

    // radii
    ["--radius-md" as any]: p.radii.md,

    // shadows
    ["--shadow-sm" as any]: p.shadows.sm,
    ["--shadow-md" as any]: p.shadows.md,
  } as React.CSSProperties;
}

function isHex(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}
function normalizeHex(v: string) {
  if (!v) return v;
  let s = v.trim();
  if (!s.startsWith("#")) s = `#${s}`;
  return isHex(s) ? s : v;
}

/* =========================
   Field groupings for layout
   ========================= */
const GROUPS: Array<{ title: string; keys: Array<keyof ThemePalette["colors"]> }> = [
  { title: "Primary", keys: ["primary", "primaryHover"] },
  { title: "Secondary", keys: ["secondary", "secondaryHover"] },
  { title: "Neutrals", keys: ["background", "surface", "text", "textMuted", "border"] },
  { title: "State colors", keys: ["success", "warning", "error"] },
];

/* =========================
   Small UI bit: Color field
   ========================= */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-40 text-sm">{label}</label>
      <input
        type="color"
        value={isHex(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 rounded border p-0"
        aria-label={`${label} color picker`}
        title="Pick color"
      />
      <Input
        className="bg-background font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        aria-label={`${label} hex`}
      />
      <div className="h-6 w-6 rounded border" style={{ background: value }} aria-hidden />
    </div>
  );
}

/* =========================
   Main component
   ========================= */
export default function BrandingThemeForm({ initial, canWrite }: Props) {
  const router = useRouter();

  const [theme, setTheme] = React.useState<BrandingTheme>(initial);
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const [previewDark, setPreviewDark] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [ok, setOk] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const current = mode === "light" ? theme.light : theme.dark;
  const previewPalette = previewDark ? theme.dark : theme.light;

  function setColor(key: keyof ThemePalette["colors"], value: string) {
    setTheme((t) => ({
      ...t,
      [mode]: {
        ...t[mode],
        colors: {
          ...t[mode].colors,
          [key]: normalizeHex(value),
        },
      },
    }));
  }

  async function saveAll() {
    if (!canWrite) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          light: theme.light,
          dark: theme.dark,
          logoUrl: theme.logoUrl,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Save failed (${res.status})`);
      }
      setOk(true);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function saveLogo(url: string | null) {
    if (!canWrite) return;
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: url }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Logo update failed (${res.status})`);
      }
      setTheme((t) => ({ ...t, logoUrl: url }));
      setOk(true);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update logo");
    }
  }

  function revertUnsaved() {
    setTheme(initial);
    setOk(false);
    setError(null);
  }

  function resetToDefaults() {
    setTheme(DEFAULTS);
    setOk(false);
    setError(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
      {/* ===== Top page header with actions ===== */}
      <div className="lg:col-span-2">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Admin Branding</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={saveAll} disabled={!canWrite || saving} className="rounded-md">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={revertUnsaved} className="rounded-md">
              Revert unsaved
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetToDefaults}
              className="rounded-md"
              title="Reset both light & dark to defaults (not saved until you press Save)"
            >
              Reset to defaults
            </Button>
            {ok && <span className="text-xs text-green-600">Saved</span>}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </div>
      </div>

      {/* LEFT: Editor column */}
      <div className="space-y-6">
        {/* Branding + logo */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Branding</CardTitle>
            <CardDescription>Upload your admin logo and pick which palette you’re editing.</CardDescription>
            <CardAction>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Editing</span>
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "light" | "dark")}
                >
                  <option value="light">Light palette</option>
                  <option value="dark">Dark palette</option>
                </select>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Admin logo (sidebar/header)</p>
              <ImageUploader
                scope="branding"
                entityId="logo"
                currentUrl={theme.logoUrl ?? ""}
                label="Upload Logo"
                onUploaded={(url) => saveLogo(url)}
                onClear={() => saveLogo(null)}
                className="max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Palette */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Palette</CardTitle>
            <CardDescription>
              {mode === "light" ? "Edit colors for the light theme." : "Edit colors for the dark theme."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.keys.map((k) => {
                    const label =
                      k === "primaryHover"
                        ? "Primary Hover"
                        : k === "secondaryHover"
                        ? "Secondary Hover"
                        : k.charAt(0).toUpperCase() + k.slice(1);
                    const val = (mode === "light" ? theme.light.colors[k] : theme.dark.colors[k]) || "";
                    return (
                      <ColorField
                        key={k}
                        label={label}
                        value={val}
                        onChange={(v) => setColor(k, v)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: Sticky preview column */}
      <div className="space-y-3 lg:sticky lg:top-20 h-fit">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Preview</CardTitle>
            <CardAction>
              <label className="flex select-none items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={previewDark}
                  onChange={(e) => setPreviewDark(e.target.checked)}
                />
                Dark mode
              </label>
            </CardAction>
          </CardHeader>
          <CardContent>
            {/* Scoped CSS so hover/active work without affecting your app */}
            <style
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: `
                  .branding-preview .btn {
                    transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
                    border-radius: var(--radius-md);
                    line-height: var(--lh-normal);
                    font-size: var(--fs-sm);
                    padding: 0.5rem 0.75rem;
                  }
                  .branding-preview .btn-primary { background: var(--primary); color: var(--primary-foreground); box-shadow: var(--shadow-md); }
                  .branding-preview .btn-primary:hover { background: var(--primary-hover); }
                  .branding-preview .btn-secondary { background: var(--secondary); color: var(--secondary-foreground); box-shadow: var(--shadow-sm); }
                  .branding-preview .btn-secondary:hover { background: var(--secondary-hover); }
                  .branding-preview .btn-ghost { background: transparent; color: var(--card-foreground); border: 1px solid var(--border); }
                  .branding-preview .btn-destructive { background: var(--destructive); color: white; box-shadow: var(--shadow-sm); }

                  .branding-preview .link { color: var(--primary-foreground); text-decoration: underline transparent; text-underline-offset: 2px; }
                  .branding-preview .link:hover { text-decoration-color: currentColor; color: var(--secondary-foreground); background: var(--secondary); }

                  .branding-preview .alert { border: 1px solid; border-radius: var(--radius-md); padding: 0.5rem 0.75rem; }
                  .branding-preview .alert-success { border-color: var(--success); }
                  .branding-preview .alert-warning { border-color: var(--warning); }
                  .branding-preview .alert-error { border-color: var(--destructive); }

                  .branding-preview .field input {
                    width: 100%;
                    border: 1px solid var(--border);
                    background: var(--card);
                    color: var(--card-foreground);
                    border-radius: var(--radius-md);
                    padding: 0.5rem 0.75rem;
                  }
                  .branding-preview .field input:focus {
                    outline: 2px solid var(--ring);
                    outline-offset: 2px;
                  }
                `,
              }}
            />
            <section
              className={`branding-preview ${previewDark ? "dark" : ""}`}
              style={toCssVars(previewPalette)}
              data-admin
            >
              {/* Two-up content showing common UI */}
              <div className="grid gap-4">
                {/* Card: text + muted + actions */}
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* 🟦 colorful header */}
                  <div
                    className="px-4 py-2 text-sm font-medium"
                    style={{ background: "var(--card-header-bg)", color: "var(--card-header-fg)" }}
                  >
                    Product details
                  </div>

                  <div className="p-4">
                    <div className="mb-1 text-sm text-muted-foreground">
                      This simulates a typical card.
                    </div>
                    <p className="mb-3 text-sm" style={{ fontSize: "var(--fs-base)" }}>
                      Use buttons to see hover. Try the link too:{" "}
                      <a className="link rounded px-1" href="#">
                        view more
                      </a>
                      .
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-primary">Primary</button>
                      <button className="btn btn-secondary">Secondary</button>
                      <button className="btn btn-ghost">Ghost</button>
                      <button className="btn btn-destructive">Delete</button>
                    </div>
                  </div>
                </div>

                {/* Card: alerts + input focus */}
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* 🟦 colorful header */}
                  <div
                    className="px-4 py-2 text-sm font-medium"
                    style={{ background: "var(--card-header-bg)", color: "var(--card-header-fg)" }}
                  >
                    Notifications & Inputs
                  </div>

                  <div className="p-4">
                    <div className="alert alert-success mb-2 text-sm">Success – operation completed.</div>
                    <div className="alert alert-warning mb-2 text-sm">Warning – please double check.</div>
                    <div className="alert alert-error mb-3 text-sm">Error – something went wrong.</div>

                    <div className="field">
                      <input placeholder="Focus me to see ring (uses primaryHover)" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
