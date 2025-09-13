// src/lib/api/client.ts
// NOTE: Use this only from client components / the browser.
// It auto-injects x-csrf-token for POST/PUT/PATCH/DELETE based on the `csrf` cookie.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getCsrfFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((s) => s.startsWith("csrf="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function bodyIsFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function hasContentType(headers: Headers): boolean {
  for (const k of headers.keys()) if (k.toLowerCase() === "content-type") return true;
  return false;
}

/** Low-level wrapper: injects x-csrf-token for mutating methods. */
export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || undefined);

  if (MUTATING.has(method)) {
    const token = getCsrfFromCookie();
    if (token) headers.set("x-csrf-token", token);
  }

  return fetch(input, { ...init, headers });
}

/**
 * High-level JSON-friendly fetch you already had, now powered by csrfFetch.
 * - Auto sets Content-Type: application/json when you pass a non-FormData body and no content-type is set.
 * - Parses JSON response (if present).
 * - Preserves your 401 redirect + 403 alert logic.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || undefined);

  // If caller provided a body and didn't set a content-type,
  // assume JSON unless it's FormData (let browser set multipart boundary).
  if (init.body != null && !bodyIsFormData(init.body) && !hasContentType(headers)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await csrfFetch(input, { ...init, headers });

  let body: any = null;
  try {
    body = await res.clone().json(); // clone so callers could still read body if needed
  } catch {
    // non-JSON or empty body
  }

  if (!res.ok) {
    const code = res.headers.get("x-deny-reason") || body?.error?.code;
    const msg = body?.error?.message || "Something went wrong.";

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        const here = window.location.pathname + window.location.search + window.location.hash;
        const u = new URL("/login", window.location.origin);
        u.searchParams.set("reason", "expired");
        u.searchParams.set("callbackUrl", here);
        window.location.href = u.toString();
      }
    } else if (res.status === 403) {
      if (typeof window !== "undefined") alert(msg);
    }

    throw Object.assign(new Error(msg), {
      status: res.status,
      code,
      details: body?.error?.details,
      response: res,
    });
  }

  return body?.data ?? body;
}

/* ---------- Convenience helpers for JSON endpoints ---------- */

export async function postJSON<T = unknown>(
  url: string,
  payload: unknown,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || undefined);
  headers.set("Content-Type", "application/json");
  const data = await apiFetch(url, {
    ...init,
    method: "POST",
    headers,
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
  return data as T;
}

export async function putJSON<T = unknown>(
  url: string,
  payload: unknown,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || undefined);
  headers.set("Content-Type", "application/json");
  const data = await apiFetch(url, {
    ...init,
    method: "PUT",
    headers,
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
  return data as T;
}

export async function patchJSON<T = unknown>(
  url: string,
  payload: unknown,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || undefined);
  headers.set("Content-Type", "application/json");
  const data = await apiFetch(url, {
    ...init,
    method: "PATCH",
    headers,
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
  return data as T;
}

export async function deleteJSON<T = unknown>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const data: any = await apiFetch(url, { ...init, method: "DELETE" });
  return data as T;
}
