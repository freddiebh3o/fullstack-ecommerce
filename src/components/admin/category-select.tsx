"use client";

import * as React from "react";
import { ControllerRenderProps } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { name: string; slug: string };

export default function CategorySelect({
  field,
  options,
  placeholder = "Choose a category",
}: {
  field: ControllerRenderProps<any, any>; // RHF field for "categorySlug"
  options: Option[];
  placeholder?: string;
}) {
  return (
    <Select
      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
      value={field.value ?? ""}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No category</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.slug} value={o.slug}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
