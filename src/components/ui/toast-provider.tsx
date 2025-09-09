"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils/misc";

type Toast = { id: string; title?: string; message: string; variant?: "default" | "destructive" };
type Ctx = { push: (t: Omit<Toast, "id">) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const ctx = useMemo<Ctx>(() => ({
    push: ({ title, message, variant = "default" }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, title, message, variant }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    },
  }), []);

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-md border bg-background px-4 py-3 shadow-md w-80",
              t.variant === "destructive" && "border-destructive/50 bg-destructive/10"
            )}
          >
            {t.title && <div className="font-semibold mb-1">{t.title}</div>}
            <div className="text-sm">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
