// src/lib/security/cors.ts
import { NextResponse, type NextRequest } from "next/server";
import { ALLOWED_ORIGINS, APP_ORIGIN, ENABLE_CORS } from "./config";

/** Handle CORS preflight (OPTIONS) requests. */
export function handleCorsPreflight(req: NextRequest) {
  if (!ENABLE_CORS) return new NextResponse(null, { status: 204 });

  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin);

  if (!allowed) {
    return new NextResponse(null, {
      status: 403,
      headers: { "x-deny-reason": `cors-preflight-disallowed:${origin || "none"}` },
    });
  }

  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  res.headers.set("Access-Control-Allow-Headers", "content-type,x-csrf-token");
  // no credentials by default; keep posture tight
  res.headers.set("Access-Control-Max-Age", "600"); // cache preflight 10m
  return res;
}

/**
 * For non-OPTIONS requests:
 *  - If Origin is present and NOT allowed → block with 403.
 *  - If Origin is allowed and NOT same as APP_ORIGIN (true cross-origin in dev),
 *    we reflect ACAO so the browser can read the response.
 * Returns: { block?: NextResponse, reflectOrigin?: string }
 */
export function enforceCorsOnRequest(req: NextRequest): {
  block?: NextResponse;
  reflectOrigin?: string;
} {
  if (!ENABLE_CORS) return {};

  const origin = req.headers.get("origin");
  if (!origin) return {}; // same-origin or non-CORS context

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return {
      block: new NextResponse("Forbidden: cors", {
        status: 403,
        headers: { "x-deny-reason": `cors-origin-not-allowed:${origin}` },
      }),
    };
  }

  // If it's truly cross-origin (e.g., 127.0.0.1 ↔ localhost in dev), reflect ACAO
  if (origin !== APP_ORIGIN) {
    return { reflectOrigin: origin };
  }
  return {};
}
