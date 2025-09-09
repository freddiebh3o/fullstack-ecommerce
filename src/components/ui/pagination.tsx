import Link from "next/link";
import { cn } from "@/lib/utils/misc";

export default function Pagination({
  current,
  totalPages,
  q,
}: {
  current: number;
  totalPages: number;
  q?: string;
}) {
  if (totalPages <= 1) return null;

  const qs = (page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(page));
    return `?${params.toString()}`;
  };

  return (
    <nav className="flex items-center gap-2">
      <Link
        href={`/admin/brands${qs(Math.max(1, current - 1))}`}
        className={cn(
          "rounded-md border px-3 py-1 text-sm",
          current === 1 && "pointer-events-none opacity-50"
        )}
      >
        Prev
      </Link>
      <span className="text-sm text-muted-foreground">
        Page {current} of {totalPages}
      </span>
      <Link
        href={`/admin/brands${qs(Math.min(totalPages, current + 1))}`}
        className={cn(
          "rounded-md border px-3 py-1 text-sm",
          current === totalPages && "pointer-events-none opacity-50"
        )}
      >
        Next
      </Link>
    </nav>
  );
}
