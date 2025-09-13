// src/lib/http/apiFetch.ts
// Client-only helper (401 redirect, 403 throw) + auto-CSRF for POST/PUT/PATCH/DELETE.
// Now self-heals: if no CSRF cookie is present, it makes a HEAD request to the current page
// to trigger the middleware to set the cookie, then retries.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getCsrfFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((s) => s.startsWith("csrf="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

async function ensureCsrfCookie(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  // If cookie already exists, use it
  let token = getCsrfFromCookie();
  if (token) return token;

  try {
    // Trigger middleware CSRF issuance (Step 1) without changing the page.
    // HEAD avoids downloading the whole document.
    await fetch(window.location.href, { method: "HEAD", credentials: "include" });
  } catch {
    // ignore
  }
  // Re-read after HEAD
  token = getCsrfFromCookie();
  return token;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || undefined);

  if (MUTATING.has(method)) {
    // Try to ensure we actually have the cookie before sending the request
    const csrf = await ensureCsrfCookie();
    if (csrf) headers.set("x-csrf-token", csrf);
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    const url = new URL("/login", window.location.origin);
    url.searchParams.set("callbackUrl", window.location.pathname + window.location.search);
    url.searchParams.set("reason", "expired");
    window.location.assign(url.toString());
    throw new Error("UNAUTHENTICATED");
  }
  if (res.status === 403) {
    throw new Error("FORBIDDEN");
  }

  return res;
}
