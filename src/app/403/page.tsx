// src/app/403/page.tsx
export const dynamic = "force-dynamic";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold mb-2">No access</h1>
      <p className="text-muted-foreground">You don&apos;t have permission to view this page.</p>
    </div>
  );
}
