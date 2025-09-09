// src/lib/auth/index.ts
export * from "./permissions";
export * as Guards from "./guards/api";
export * as PageGuards from "./guards/page";
export * as SystemGuards from "./guards/system";
export { default as authOptions } from "./nextauth"; // if you default-export there
