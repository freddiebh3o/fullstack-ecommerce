// src/app/not-found.tsx
import Link from "next/link";

// Avoid static prerender for 404 so client hooks can bail out safely
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or was moved.
        </p>
        <div className="mt-4">
          <Link href="/" className="underline">Go home</Link>
        </div>
      </div>
    </div>
  );
}
