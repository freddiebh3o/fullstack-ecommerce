// src/components/admin/index/data-pager.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toQueryString } from "@/lib/paging/query";

type Scalar = string | number | boolean | undefined;
type Params = Record<string, Scalar>;

type Props = {
  basePath: string;
  page: number;
  per: number;
  total: number;
  // keep compat:
  q?: string;
  sort?: string;
  dir?: "asc" | "desc";
  /** NEW: any extra query params to retain across pages (filters, etc.) */
  params?: Params;
};

export default function DataPager({
  basePath, page, per, total, q = "", sort = "createdAt", dir = "desc", params = {},
}: Props) {
  const lastPage = Math.max(1, Math.ceil(total / per));
  const prev = Math.max(1, page - 1);
  const next = Math.min(lastPage, page + 1);

  const current = { page, per, q, sort, dir, ...params };

  const toHref = (override: Partial<typeof current>) =>
    `${basePath}?${toQueryString(current, override)}`;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{(page - 1) * per + 1}</span>–
        <span className="font-medium">{Math.min(page * per, total)}</span> of{" "}
        <span className="font-medium">{total}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={page === 1}>
          <Link href={toHref({ page: 1 })} aria-disabled={page === 1}>First</Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={page === 1}>
          <Link href={toHref({ page: prev })} aria-disabled={page === 1}>Prev</Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={page === lastPage}>
          <Link href={toHref({ page: next })} aria-disabled={page === lastPage}>Next</Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={page === lastPage}>
          <Link href={toHref({ page: lastPage })} aria-disabled={page === lastPage}>Last</Link>
        </Button>
      </div>
    </div>
  );
}
