// src/components/theme/admin-theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";

export default function AdminThemeProvider({ children, nonce }: { children: React.ReactNode, nonce: string | undefined }) {

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      // 👇 This ensures the tiny inline boot script from next-themes has a nonce
      nonce={nonce}
    >
      {children}
    </ThemeProvider>
  );
}
