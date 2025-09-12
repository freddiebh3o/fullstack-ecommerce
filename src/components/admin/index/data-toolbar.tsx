// src/components/admin/index/DataToolbar.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/* --- types (unchanged) --- */
export type SortOption = { value: string; label: string };
export type Option = { value: string; label: string };

type BaseFilter = { id: string; label: string; colSpan?: string };

export type FilterText = BaseFilter & {
  kind: "text"; name: string; placeholder?: string; value?: string;
};
export type FilterSelect = BaseFilter & {
  kind: "select"; name: string; value?: string; placeholder?: string;
  options: Option[]; allowEmpty?: boolean;
};
export type FilterNumberRange = BaseFilter & {
  kind: "numberRange"; minName: string; maxName: string;
  min?: number | string; max?: number | string;
  placeholderMin?: string; placeholderMax?: string; step?: number;
};
export type FilterDateRange = BaseFilter & {
  kind: "dateRange"; fromName: string; toName: string; from?: string; to?: string;
};
export type FilterCheckbox = BaseFilter & {
  kind: "checkbox"; name: string; checked?: boolean; value?: string;
};
export type AnyFilter =
  | FilterText | FilterSelect | FilterNumberRange | FilterDateRange | FilterCheckbox;

type Props = {
  action?: string;
  search?: { name?: string; value?: string; placeholder?: string; label?: string };
  filters?: AnyFilter[];
  sort?: string;
  dir?: "asc" | "desc";
  per?: number;
  sortOptions?: SortOption[];
  perOptions?: number[];
  collapsible?: boolean;
};

/* --- helpers --- */
function hasAnyActiveFilter(
  search: Props["search"],
  filters: AnyFilter[],
) {
  if (search?.value) return true;
  for (const f of filters || []) {
    if (f.kind === "text" && f.value) return true;
    if (f.kind === "select" && typeof f.value === "string" && f.value !== "") return true;
    if (f.kind === "numberRange" && (f.min || f.max)) return true;
    if (f.kind === "dateRange" && (f.from || f.to)) return true;
    if (f.kind === "checkbox" && f.checked) return true;
  }
  return false;
}

/* --- component --- */
export default function DataToolbar({
  action,
  search = { name: "q", value: "", placeholder: "Search...", label: "Search" },
  filters = [],
  sort = "createdAt",
  dir = "desc",
  per = 20,
  sortOptions = [
    { value: "createdAt", label: "Created" },
    { value: "name", label: "Name" },
  ],
  perOptions = [10, 20, 50, 100],
  collapsible = true,
}: Props) {
  const reduceMotion = useReducedMotion();
  const defaultOpen = hasAnyActiveFilter(search, filters);
  const [open, setOpen] = React.useState(defaultOpen);

  const setHidden = (name: string, value: string) => {
    const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (el) el.value = value;
  };

  const contentId = React.useId();

  return (
    <form action={action} method="get" className="space-y-3">
      {/* Toggle row (always visible) */}
      {collapsible && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {open ? "Filters visible" : "Filters hidden"}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(s => !s)}
            aria-expanded={open}
            aria-controls={contentId}
            data-state={open ? "open" : "closed"}
            title={open ? "Hide filters" : "Show filters"}
          >
            {open ? "Hide filters" : "Show filters"}
          </Button>
        </div>
      )}

      {/* Entire toolbar content collapses: filters + sort + submit */}
      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div
            key="toolbar-body"
            id={contentId}
            initial={reduceMotion ? false : { height: 0, opacity: 0, y: -8 }}
            animate={reduceMotion ? { height: "auto", opacity: 1 } : { height: "auto", opacity: 1, y: 0 }}
            exit={reduceMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="space-y-3">
              {/* ===== Filters grid ===== */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                {/* Search */}
                <div className={search?.label ? "space-y-1" : ""}>
                  {search?.label ? (
                    <Label htmlFor={search.name || "q"}>{search.label}</Label>
                  ) : null}
                  <Input
                    id={search.name || "q"}
                    name={search.name || "q"}
                    defaultValue={search.value || ""}
                    placeholder={search.placeholder || "Search..."}
                  />
                </div>

                {filters.map((f) => {
                  const common = f.colSpan ? ` ${f.colSpan}` : "";
                  switch (f.kind) {
                    case "text":
                      return (
                        <div key={f.id} className={`space-y-1${common}`}>
                          <Label htmlFor={f.name}>{f.label}</Label>
                          <Input
                            id={f.name}
                            name={f.name}
                            defaultValue={f.value || ""}
                            placeholder={f.placeholder || ""}
                          />
                        </div>
                      );

                    case "select": {
                      const EMPTY = "__ANY__";
                      const initial =
                        f.value && f.value !== "" ? f.value : (f.allowEmpty ? EMPTY : "");
                      return (
                        <div key={f.id} className={`space-y-1${common}`}>
                          <Label>{f.label}</Label>
                          <input type="hidden" name={f.name} defaultValue={f.value || ""} />
                          <Select
                            defaultValue={initial}
                            onValueChange={(v) => setHidden(f.name, v === EMPTY ? "" : v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={f.placeholder || "Select..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {f.allowEmpty && (
                                <SelectItem value={EMPTY}>
                                  {f.placeholder || "Any"}
                                </SelectItem>
                              )}
                              {f.options.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }

                    case "numberRange":
                      return (
                        <div key={f.id} className={`space-y-1${common}`}>
                          <Label>{f.label}</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              inputMode="decimal"
                              step={f.step ?? 1}
                              name={f.minName}
                              defaultValue={f.min ?? ""}
                              placeholder={f.placeholderMin || "Min"}
                            />
                            <Input
                              type="number"
                              inputMode="decimal"
                              step={f.step ?? 1}
                              name={f.maxName}
                              defaultValue={f.max ?? ""}
                              placeholder={f.placeholderMax || "Max"}
                            />
                          </div>
                        </div>
                      );

                    case "dateRange":
                      return (
                        <div key={f.id} className={`space-y-1${common}`}>
                          <Label>{f.label}</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input type="date" name={f.fromName} defaultValue={f.from ?? ""} />
                            <Input type="date" name={f.toName} defaultValue={f.to ?? ""} />
                          </div>
                        </div>
                      );

                    case "checkbox":
                      return (
                        <div key={f.id} className={`flex items-center gap-2${common}`}>
                          <input
                            id={f.name}
                            type="checkbox"
                            className="h-4 w-4"
                            name={f.name}
                            defaultChecked={!!f.checked}
                            value={f.value ?? "1"}
                          />
                          <Label htmlFor={f.name}>{f.label}</Label>
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
              </div>

              {/* Reset page on any filter change */}
              <input type="hidden" name="page" value="1" />

              {/* ===== Sort/per grid (Apply button included) ===== */}
              <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px_160px_110px]">
                {/* spacer / grow area */}
                <div className="md:col-span-1" />

                {/* Sort field */}
                <div className="space-y-1">
                  <Label>Sort</Label>
                  <input type="hidden" name="sort" defaultValue={sort} />
                  <Select defaultValue={sort} onValueChange={(v) => setHidden("sort", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Direction */}
                <div className="space-y-1">
                  <Label>Direction</Label>
                  <input type="hidden" name="dir" defaultValue={dir} />
                  <Select defaultValue={dir} onValueChange={(v: "asc" | "desc") => setHidden("dir", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">ASC</SelectItem>
                      <SelectItem value="desc">DESC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Per page */}
                <div className="space-y-1">
                  <Label>Per Page</Label>
                  <input type="hidden" name="per" defaultValue={per} />
                  <Select defaultValue={String(per)} onValueChange={(v) => setHidden("per", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                      {perOptions.map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {p} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Apply button (same row) */}
                <div className="flex justify-end mb-1">
                  <Button type="submit" className="w-full md:w-auto">Apply Filters</Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
