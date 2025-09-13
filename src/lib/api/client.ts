// src/lib/api/client.ts
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });

  let body: any = null;
  try { body = await res.json(); } catch {}

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
    });
  }

  return body?.data ?? body;
}
