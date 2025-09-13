// src/lib/security/http.ts
export const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
export const isMutatingMethod = (m: string) => MUTATING.has(m.toUpperCase());

export const isApiRoute = (pathname: string) => pathname.startsWith("/api/");
export const isNextAuthRoute = (pathname: string) => pathname.startsWith("/api/auth");
