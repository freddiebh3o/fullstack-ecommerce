// src/lib/security/headers.ts
import type { NextResponse } from "next/server";
import { DEV, APP_ORIGIN, ALLOWED_IMG_HOSTS, ALLOWED_CONNECT_HOSTS } from "./config";

/** Build a CSP string based on env + allow-lists + optional nonce. */
export function buildCsp(nonce?: string | null): string {
  const n = nonce ? `'nonce-${nonce}'` : "";
  const imgHosts = [...new Set(ALLOWED_IMG_HOSTS)].join(" ");
  const connectHosts = [...new Set(ALLOWED_CONNECT_HOSTS)].join(" ");

  // Dev allowances for Next.js HMR/sourcemaps
  const devScript = DEV ? " 'unsafe-eval' 'wasm-unsafe-eval'" : "";

  // ── Styles policy (pragmatic):
  //  - We keep scripts strict with nonce.
  //  - For styles, allow inline <style> tags without nonce because some are created client-side.
  //  - Keep style attributes allowed (React inlines some style attr)
  //  - Do NOT put a nonce in style-* directives, or browsers will ignore 'unsafe-inline'.
  const styleFallback = `style-src 'self' 'unsafe-inline';`;
  const styleElem    = `style-src-elem 'self' 'unsafe-inline';`;
  const styleAttr    = `style-src-attr 'unsafe-inline';`;

  const csp =
    `default-src 'self';` +
    `base-uri 'self';` +
    `form-action ${APP_ORIGIN};` +
    `frame-ancestors 'self';` +
    // Scripts: strict (nonce + strict-dynamic).
    `script-src 'self' ${n} 'strict-dynamic'${devScript};` +
    // Styles:
    styleFallback +
    styleElem +
    styleAttr +
    // Other sources:
    `img-src 'self' data: blob: ${imgHosts};` +
    `font-src 'self' data:;` +
    `connect-src 'self' ws: wss: ${connectHosts};` +
    `object-src 'none';` +
    `upgrade-insecure-requests`;

  return csp.replace(/\s{2,}/g, " ").trim();
}

export function applySecurityHeaders(res: NextResponse, nonce?: string | null) {
  res.headers.set("Content-Security-Policy", buildCsp(nonce));
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "bluetooth=()",
      "vr=()",
      "xr-spatial-tracking=()",
    ].join(", ")
  );
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-site");
  return res;
}
