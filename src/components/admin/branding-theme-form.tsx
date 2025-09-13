// src/components/admin/branding-theme-form.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import ImageUploader from "@/components/admin/image-uploader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import Image from "next/image";

import type { BrandingTheme, ThemePalette } from "@/lib/branding/defaults";
import { DEFAULT_THEME as DEFAULTS } from "@/lib/branding/defaults";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

/* =========================
   Helpers
   ========================= */
function toCssVars(p: ThemePalette): React.CSSProperties {
  return {
    // core colors
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

    ["--ring" as any]: p.colors.ring ?? p.colors.primaryHover,

    // header / section tokens
    ["--card-header-bg" as any]: p.colors.headerBg ?? p.colors.primary,
    ["--card-header-fg" as any]: p.colors.headerTitle ?? p.colors.text,
    ["--card-header-desc" as any]: p.colors.headerDesc ?? p.colors.textMuted,

    // table header tokens
    ["--table-header-bg" as any]: p.colors.tableHeaderBg ?? p.colors.surface,
    ["--table-header-fg" as any]: p.colors.tableHeaderFg ?? p.colors.text,

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

    // === Sidebar tokens (used by AdminSidebar) ===
    ["--sidebar" as any]: p.colors.surface,
    ["--sidebar-foreground" as any]: p.colors.text,
    ["--sidebar-border" as any]: p.colors.border,
    ["--sidebar-primary" as any]: p.colors.primary,
    ["--sidebar-ring" as any]: p.colors.ring ?? p.colors.primaryHover,

    // Header title token used by sidebar hover/active text
    ["--header-title" as any]: p.colors.headerTitle ?? p.colors.text,
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
  // New groups
  { title: "Headers (Card / Section)", keys: ["headerBg", "headerTitle", "headerDesc"] },
  { title: "Table Header", keys: ["tableHeaderBg", "tableHeaderFg"] },
];


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
    <div className="flex flex-col gap-1">
      <Label className="w-44 text-sm">{label}</Label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={isHex(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10"
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
        {/* <div className="h-6 w-6 rounded border" style={{ background: value }} aria-hidden /> */}
      </div>
    </div>
  );
}

/* =========================
   Main component
   ========================= */
type Props = {
  initial: BrandingTheme;
  canWrite: boolean;
};

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
    // Resets to canonical defaults (not saved until Save is pressed)
    setTheme({
      light: DEFAULTS.light,
      dark: DEFAULTS.dark,
      logoUrl: null,
      metaVersion: DEFAULTS.metaVersion,
    } as BrandingTheme);
    setOk(false);
    setError(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
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
              <div className="flex flex-col items-start gap-3">
                {/* shadcn Select */}
                <Select value={mode} onValueChange={(v: "light" | "dark") => setMode(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Choose palette" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light palette</SelectItem>
                    <SelectItem value="dark">Dark palette</SelectItem>
                  </SelectContent>
                </Select>
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
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {group.keys.map((k) => {
                    const label =
                      k === "primaryHover"
                        ? "Primary Hover"
                        : k === "secondaryHover"
                        ? "Secondary Hover"
                        : k === "headerBg"
                        ? "Header Background"
                        : k === "headerTitle"
                        ? "Header Title"
                        : k === "headerDesc"
                        ? "Header Description"
                        : k === "tableHeaderBg"
                        ? "Table Header Background"
                        : k === "tableHeaderFg"
                        ? "Table Header Text"
                        : (k as string).charAt(0).toUpperCase() + (k as string).slice(1);

                    const val =
                      (mode === "light" ? theme.light.colors[k] : theme.dark.colors[k]) || "";

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
              {/* Dark-mode preview toggle (uses shadcn Switch you already wired) */}
              <div className="flex items-center gap-2">
                <Label htmlFor="preview-dark" className="text-sm">
                  Dark mode
                </Label>
                <Switch
                  id="preview-dark"
                  checked={previewDark}
                  onCheckedChange={setPreviewDark}
                  aria-label="Toggle dark mode preview"
                />
              </div>
            </CardAction>
          </CardHeader>

          <CardContent>
            {/* Scoped CSS so hover/active work without affecting your app */}
            <style
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: `
                  .branding-preview {
                    padding: 1rem;
                    border-radius: var(--radius-md);
                  }
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

                  .branding-preview .alert {
                    border: 1px solid;
                    border-radius: var(--radius-md);
                    padding: 0.5rem 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                  }
                  .branding-preview .alert-success { border-color: var(--success); }
                  .branding-preview .alert-warning { border-color: var(--warning); }
                  .branding-preview .alert-error { border-color: var(--destructive); }

                  .branding-preview .alert-success .icon { color: var(--success); }
                  .branding-preview .alert-warning .icon { color: var(--warning); }
                  .branding-preview .alert-error .icon { color: var(--destructive); }

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

                  /* header section preview */
                  .branding-preview .card-header {
                    background: var(--card-header-bg);
                    color: var(--card-header-fg);
                  }
                  .branding-preview .card-header .desc {
                    color: var(--card-header-desc);
                  }

                  /* table header preview */
                  .branding-preview table thead th {
                    background: var(--table-header-bg);
                    color: var(--table-header-fg);
                  }
                `,
              }}
            />

            <section
              className={`branding-preview ${previewDark ? "dark" : ""}`}
              style={toCssVars(previewPalette)}
            >
              <div className="grid gap-4">
                {/* ===== Sidebar preview (matches AdminSidebar styles) ===== */}
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="text-sm font-medium">Sidebar preview</div>
                    <div className="text-xs text-muted-foreground">Shows your logo + link states with sidebar tokens</div>
                  </div>

                  <div className="p-4">
                    <div
                      className="sidebar-preview rounded-md border"
                      style={{
                        background: "var(--sidebar)",
                        color: "var(--sidebar-foreground)",
                        borderColor: "var(--sidebar-border)",
                      }}
                    >
                      {/* Logo area (same structure as AdminSidebar) */}
                      <div
                        className="p-3 border-b flex items-center justify-center"
                        style={{ borderColor: "var(--sidebar-border)" }}
                      >
                        {theme.logoUrl ? (
                          <Image
                            src={theme.logoUrl}
                            alt="Tenant logo"
                            width={120}
                            height={40}
                            className={`h-10 w-auto object-contain ${previewDark ? "invert" : ""}`}
                            priority
                          />
                        ) : (
                          <div className="text-xs opacity-75">No logo uploaded</div>
                        )}
                      </div>

                      {/* Sample links (hover/active/focus use the same tokens as AdminSidebar) */}
                      <nav className="p-3">
                        <ul className="space-y-1">
                          {[
                            { label: "Dashboard", active: false },
                            { label: "Products", active: true }, // active example
                            { label: "Categories", active: false },
                            { label: "Brands", active: false },
                          ].map((item) => (
                            <li key={item.label}>
                              <div
                                className={[
                                  "group flex items-center rounded-md px-3 py-2 text-sm outline-none transition-colors",
                                  "cursor-default select-none", // not clickable in preview
                                  "text-[color-mix(in_oklab,var(--sidebar-foreground),transparent_20%)]",
                                  // Hover (uses primary-hover + header-title)
                                  "hover:bg-[var(--primary-hover)] hover:text-[var(--header-title)]",
                                  // Focus ring (sidebar ring token) — show on keyboard nav demo
                                  "focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--sidebar-ring),transparent_50%)] focus-visible:border-[var(--sidebar-ring)]",
                                  // Active (current page) uses sidebar-primary + header-title
                                  item.active ? "bg-[var(--sidebar-primary)] text-[var(--header-title)] font-medium" : "",
                                ].join(" ")}
                                tabIndex={0}
                                aria-current={item.active ? "page" : undefined}
                              >
                                {item.label}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </nav>
                    </div>
                  </div>
                </div>

                {/* Card: header + content */}
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* header using header tokens */}
                  <div className="card-header px-4 py-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {/* Optional header icon; remove if you don't want it */}
                      <Info className="h-4 w-4" aria-hidden />
                      Product details
                    </div>
                    <div className="desc text-xs">Example header using headerBg/headerTitle/headerDesc</div>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Intro text + link */}
                    <div className="text-sm text-muted-foreground">
                      This simulates a typical card.
                    </div>
                    <p className="text-sm" style={{ fontSize: "var(--fs-base)" }}>
                      Use buttons to see hover. Try the link too:{" "}
                      <a className="link rounded px-1" href="#">
                        view more
                      </a>
                      .
                    </p>

                    {/* Buttons (kept) */}
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-primary">Primary</button>
                      <button className="btn btn-secondary">Secondary</button>
                      <button className="btn btn-ghost">Ghost</button>
                      <button className="btn btn-destructive">Delete</button>
                    </div>

                    {/* State alerts with icons */}
                    <div className="alert alert-success text-sm">
                      <CheckCircle2 className="icon h-4 w-4" aria-hidden />
                      <span>Success — operation completed.</span>
                    </div>
                    <div className="alert alert-warning text-sm">
                      <AlertTriangle className="icon h-4 w-4" aria-hidden />
                      <span>Warning — please double check.</span>
                    </div>
                    <div className="alert alert-error text-sm">
                      <XCircle className="icon h-4 w-4" aria-hidden />
                      <span>Error — something went wrong.</span>
                    </div>

                    {/* Input focus demo */}
                    <div className="field">
                      <Input placeholder="Focus me to see ring (uses primaryHover)" />
                    </div>
                  </div>
                </div>

                {/* Table preview to showcase table header tokens */}
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="text-sm font-medium">Table preview</div>
                  </div>

                  <div className="p-4 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="border" style={{ borderColor: "var(--border)" }}>
                            Name
                          </TableHead>
                          <TableHead className="border" style={{ borderColor: "var(--border)" }}>
                            Status
                          </TableHead>
                          <TableHead className="border" style={{ borderColor: "var(--border)" }}>
                            Price
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="border" style={{ borderColor: "var(--border)" }}>
                            SunLite 400W
                          </TableCell>
                          <TableCell className="border" style={{ borderColor: "var(--border)" }}>
                            Active
                          </TableCell>
                          <TableCell className="border" style={{ borderColor: "var(--border)" }}>
                            £149.99
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="border" style={{ borderColor: "var(--border)" }}>
                            EcoPower 3kW
                          </TableCell>
                          <TableCell className="border" style={{ borderColor: "var(--border)" }}>
                            Active
                          </TableCell>
                          <TableCell className="border" style={{ borderColor: "var(--border)" }}>
                            £229.99
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
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
