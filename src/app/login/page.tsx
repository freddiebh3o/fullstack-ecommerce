// src/app/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function useThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // initial: localStorage -> system -> default light
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    let initial: "light" | "dark" = "light";
    if (stored === "light" || stored === "dark") initial = stored;
    else if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ) {
      initial = "dark";
    }
    document.documentElement.classList.toggle("dark", initial === "dark");
    setTheme(initial);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("theme", next);
      } catch {}
      return next;
    });
  };

  return { theme, toggle };
}

function ReasonBanner({
  reason,
  authError,
}: {
  reason: string | null;
  authError: string | null;
}) {
  let message: string | null = null;
  let tone: "info" | "warn" | "error" = "info";

  if (reason === "expired") {
    message = "Your session expired. Please sign in again.";
    tone = "warn";
  } else if (reason === "signedout" || reason === "signout") {
    message = "You have been signed out.";
    tone = "info";
  } else if (reason === "forbidden") {
    message =
      "You don’t have access to that resource. Try a different account or request access.";
    tone = "warn";
  } else if (reason === "unauthenticated") {
    message = "Please sign in to continue.";
    tone = "info";
  } else if (authError) {
    // Basic mapping for common NextAuth errors
    if (authError === "CredentialsSignin") {
      message = "Sign-in failed. Check your email and password.";
      tone = "error";
    } else {
      message = "Sign-in failed. Please try again.";
      tone = "error";
    }
  }

  if (!message) return null;

  const cls =
    tone === "error"
      ? "border-red-300 bg-red-50 text-red-700"
      : tone === "warn"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : "border-blue-300 bg-blue-50 text-blue-800";

  return (
    <div
      className={`mb-4 rounded-md border px-3 py-2 text-sm ${cls}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { theme, toggle } = useThemeToggle();

  // Prefer callbackUrl; fall back to legacy `from`; default to /admin
  const callbackUrl = useMemo(() => {
    return sp.get("callbackUrl") || sp.get("from") || "/admin";
  }, [sp]);

  // Reason & NextAuth error
  const reason = sp.get("reason"); // e.g., "expired", "signedout"
  const authError = sp.get("error"); // e.g., "CredentialsSignin"

  // Fallback: if no explicit reason but we have a callbackUrl, show "unauthenticated"
  const normalizedReason = reason ?? (sp.get("callbackUrl") ? "unauthenticated" : null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear helper cookie on explicit sign-out
  useEffect(() => {
    if (reason === "signedout" || reason === "signout") {
      try {
        document.cookie = "x-had-auth=; Max-Age=0; Path=/; SameSite=Lax";
      } catch {}
    }
  }, [reason]);

  useEffect(() => {
    // Only set localError if we don't already have a reason banner
    if (!normalizedReason && authError) {
      setLocalError("Sign-in failed. Check your email and password.");
    } else {
      setLocalError(null);
    }
  }, [normalizedReason, authError]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false, // handle routing ourselves to honor callbackUrl
    });

    setSubmitting(false);

    if (!res || res.error) {
      setLocalError("Invalid credentials. Please try again.");
      return;
    }

    // Mark that the user has had a session (helps middleware show "expired" later)
    try {
      document.cookie = "x-had-auth=1; Max-Age=31536000; Path=/; SameSite=Lax";
    } catch {}

    // Successful login
    router.push(callbackUrl);
  }

  const canSubmit = email.trim() !== "" && password.trim() !== "";

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* LEFT: form */}
      <div className="relative flex items-center justify-center px-6 py-12">
        {/* Theme toggle (top-right on the form column) */}
        <div className="absolute right-4 top-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggle}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="rounded-full"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to manage your store.
            </p>
          </div>

          {/* Reason-aware banner */}
          <ReasonBanner reason={normalizedReason} authError={authError} />

          {/* Fallback/local error */}
          {localError && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {localError}
            </div>
          )}

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {/* <a className="text-xs underline" href="/forgot">Forgot password?</a> */}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      autoComplete="current-password"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canSubmit && !submitting) onSubmit(e as any);
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs underline"
                      onClick={() => setShowPw((s) => !s)}
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full text-white" disabled={submitting || !canSubmit}>
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-xs text-muted-foreground">
            You&rsquo;ll be redirected to{" "}
            <span className="font-medium">{callbackUrl}</span> after sign-in.
          </p>
        </div>
      </div>

      {/* RIGHT: hero image */}
      <div className="relative hidden lg:block">
        <Image
          src="/login-hero.jpg"
          alt="Operations dashboard"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-8 left-8 right-8 text-white drop-shadow-sm">
          <h2 className="text-2xl font-semibold">Manage everything in one place</h2>
          <p className="mt-2 text-sm text-white/90">
            Products, orders, customers, and more — securely and efficiently.
          </p>
        </div>
      </div>
    </div>
  );
}
