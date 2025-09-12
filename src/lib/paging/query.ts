// src/lib/paging/query.ts
export type SortDir = "asc" | "desc";

export type IndexQuery = {
  page: number;   // 1-based
  per: number;    // page size
  sort: string;   // field key you map to your DB orderBy
  dir: SortDir;
  q: string;      // free text query (search)
};

export const DEFAULT_INDEX_QUERY: IndexQuery = {
  page: 1,
  per: 20,
  sort: "createdAt",
  dir: "desc",
  q: "",
};

/**
 * Parse URLSearchParams into a normalized IndexQuery.
 * Coerces invalid numbers to sane defaults.
 */
export function parseIndexQuery(sp?: Record<string, string | string[] | undefined>): IndexQuery {
  const get = (k: string) => {
    const v = sp?.[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const page = Math.max(1, Number(get("page")) || DEFAULT_INDEX_QUERY.page);
  const per = Math.min(200, Math.max(5, Number(get("per")) || DEFAULT_INDEX_QUERY.per));
  const sort = (get("sort") || DEFAULT_INDEX_QUERY.sort).toString();
  const rawDir = (get("dir") || DEFAULT_INDEX_QUERY.dir).toString().toLowerCase();
  const dir: SortDir = rawDir === "asc" ? "asc" : "desc";
  const q = (get("q") || "").toString().trim();

  return { page, per, sort, dir, q };
}

/** Build a URL query string based on an IndexQuery, overriding any keys you pass. */
export function toQueryString(q: IndexQuery, overrides?: Partial<IndexQuery>) {
  const merged = { ...q, ...overrides };
  const params = new URLSearchParams();
  params.set("page", String(merged.page));
  params.set("per", String(merged.per));
  params.set("sort", merged.sort);
  params.set("dir", merged.dir);
  if (merged.q) params.set("q", merged.q);
  return params.toString();
}
