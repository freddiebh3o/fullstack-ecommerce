// Small helper to read numeric envs with sane defaults.
function readInt(name: string, fallback: number): number {
    const raw = process.env[name];
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
  
  export const ENV = {
    AUTH_SESSION_MAX_AGE_SECONDS: readInt("AUTH_SESSION_MAX_AGE_SECONDS", 8 * 60 * 60), // 8h
    AUTH_SESSION_UPDATE_AGE_SECONDS: readInt("AUTH_SESSION_UPDATE_AGE_SECONDS", 5 * 60), // 5m
  };
  