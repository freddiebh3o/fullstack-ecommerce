// src/components/admin/brand-select.tsx
"use client";

import { ControllerRenderProps } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { name: string; slug: string };

export default function BrandSelect({
  field,
  options,
  placeholder = "Choose a brand",
}: {
  field: ControllerRenderProps<any, any>; // RHF field for "brandSlug"
  options: Option[];
  placeholder?: string;
}) {
  return (
    <Select
      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
      value={field.value ?? ""}
    >
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No brand</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.slug} value={o.slug}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
