// src/lib/api/client.ts
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {}

  if (!res.ok) {
    const code = res.headers.get("x-deny-reason") || body?.error?.code;
    const msg = body?.error?.message || "Something went wrong.";

    // Example UX decisions:
    if (res.status === 401) {
      // redirect to sign-in
      if (typeof window !== "undefined") window.location.href = "/login";
    } else if (res.status === 403) {
      // show toast
      if (typeof window !== "undefined") alert(msg); // swap for your toast system
    }
    throw Object.assign(new Error(msg), {
      status: res.status,
      code,
      details: body?.error?.details,
    });
  }

  return body?.data ?? body; // supports ok()/plain responses
}
  