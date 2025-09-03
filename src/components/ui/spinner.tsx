// src/components/ui/spinner.tsx
"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  label = "Loading…",
}: { className?: string; label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-3 text-muted-foreground", className)}
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
