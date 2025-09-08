// src/components/admin/brand-search.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function BrandSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  // keep a single timer ref
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounced push only when user types
  const pushQuery = useMemo(
    () => (value: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        if (value) params.set("q", value);
        else params.delete("q");
        // reset to page 1 only when *query changes by user typing*
        params.delete("page");
        router.push(`/admin/brands?${params.toString()}`);
      }, 300);
    },
    [router, searchParams]
  );

  return (
    <Input
      placeholder="Search brands…"
      value={q}
      onChange={(e) => {
        const value = e.target.value;
        setQ(value);
        pushQuery(value);
      }}
      className="bg-background w-56"
    />
  );
}
