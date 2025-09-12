// src/components/theme/theme-toggle.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Prefer resolvedTheme so "system" users get the actual current value.
  const isDark = (mounted ? (resolvedTheme ?? theme) : undefined) === "dark";
  const next = isDark ? "light" : "dark";

  return (
    <Button
      size="icon"
      variant="outline"
      onClick={() => setTheme(next)}
      aria-label="Toggle theme"
      // Render title only after mount to avoid SSR/client mismatch
      title={mounted ? `Switch to ${next} mode` : undefined}
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        // Reserve space to avoid layout shift during hydration
        <span className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}
