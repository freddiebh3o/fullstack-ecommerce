// src/lib/security/nonce.ts
// Edge-safe nonce generator (no Node 'crypto' / 'Buffer' usage)

function base64url(u8: Uint8Array): string {
    let bin = "";
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  
  export function makeNonce(): string {
    const bytes = new Uint8Array(16); // 128-bit nonce
    crypto.getRandomValues(bytes);
    return base64url(bytes);
  }
  