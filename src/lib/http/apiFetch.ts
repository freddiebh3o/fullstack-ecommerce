// src/lib/http/apiFetch.ts
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
    const res = await fetch(input, { ...init, credentials: "include" });
    if (res.status === 401 && typeof window !== "undefined") {
      const url = new URL("/login", window.location.origin);
      url.searchParams.set("callbackUrl", window.location.pathname + window.location.search);
      url.searchParams.set("reason", "expired");
      window.location.assign(url.toString());
      throw new Error("UNAUTHENTICATED");
    }
    if (res.status === 403) throw new Error("FORBIDDEN");
    return res;
  }
  