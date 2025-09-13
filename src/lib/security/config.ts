// src/lib/security/config.ts
/**
 * Centralized security configuration.
 * Everything else (CSP, CORS, CSRF, Origin checks) should import from here.
 */

function toOrigin(input: string | undefined | null): string | null {
    if (!input) return null;
    try {
      // If user provided a bare host without scheme (e.g., "localhost:3000"), assume http
      const withScheme = /^[a-z]+:\/\//i.test(input) ? input : `http://${input}`;
      const u = new URL(withScheme);
      return u.origin; // scheme://host[:port]
    } catch {
      return null;
    }
  }
  
  export const DEV = process.env.NODE_ENV !== "production";
  
  // Primary app/site origin (used for Origin/Referer checks & CORS allow-list)
  export const APP_ORIGIN =
    toOrigin(process.env.APP_ORIGIN) ??
    toOrigin(process.env.NEXTAUTH_URL) ?? // reasonable fallback if set
    "http://localhost:3000";
  
  // Allow-list of cross-origins (CORS). In prod, keep this tight.
  const devOrigins = DEV ? ["http://localhost:3000", "http://127.0.0.1:3000"] : [];
  export const ALLOWED_ORIGINS = Array.from(new Set([APP_ORIGIN, ...devOrigins]));
  
  // Asset / upload hosts (for CSP img-src & connect-src)
  const S3_PUBLIC_BASE = toOrigin(process.env.S3_PUBLIC_BASE) ?? "http://s3.localhost.localstack.cloud:4566";
  const S3_PRESIGN_BASE = toOrigin(process.env.S3_PRESIGN_BASE) ?? toOrigin(process.env.S3_ENDPOINT) ?? "http://localhost:4566";
  const S3_ENDPOINT = toOrigin(process.env.S3_ENDPOINT) ?? null; // usually for server-side SDK; rarely needed in CSP
  
  // Images you intentionally load from the web (align with next.config.ts remotePatterns)
  export const ALLOWED_IMG_HOSTS = [
    "https://picsum.photos",
    S3_PUBLIC_BASE,
    // add CDN domains here later, e.g. "https://cdn.example.com"
  ];
  
  // Where the browser is allowed to open fetch/WebSocket/XHR connections
  export const ALLOWED_CONNECT_HOSTS = [
    APP_ORIGIN,       // your own API
    S3_PUBLIC_BASE,   // e.g., http://s3.localhost.localstack.cloud:4566
    S3_PRESIGN_BASE,  // e.g., http://localhost:4566   ← needed for PUT/POST to presigned URL
    // add analytics or third-party API origins here if needed
  ].filter(Boolean);
  
  // Feature toggles (handy for local debugging)
  export const ENABLE_CSRF = (process.env.ENABLE_CSRF ?? "true") !== "false";
  export const STRICT_REFERER = (process.env.STRICT_REFERER ?? "true") !== "false";
  export const ENABLE_CORS  = (process.env.ENABLE_CORS  ?? "true") !== "false";
  
  // Dev-only one-time log so you can confirm config quickly
  declare global {
    // eslint-disable-next-line no-var
    var __SECURITY_CONFIG_LOGGED__: boolean | undefined;
  }
  
  export function logSecurityConfigOnce() {
    if (!DEV) return;
    if (globalThis.__SECURITY_CONFIG_LOGGED__) return;
    globalThis.__SECURITY_CONFIG_LOGGED__ = true;
  
    // Keep this concise; avoid leaking secrets.
    console.info("[security] APP_ORIGIN:", APP_ORIGIN);
    console.info("[security] ALLOWED_ORIGINS:", ALLOWED_ORIGINS);
    console.info("[security] IMG hosts:", ALLOWED_IMG_HOSTS);
    console.info("[security] CONNECT hosts:", ALLOWED_CONNECT_HOSTS);
    console.info("[security] toggles:", { ENABLE_CSRF, STRICT_REFERER, ENABLE_CORS });
  }
  