// src/app/403/page.tsx
export default function ForbiddenPage() {
    return (
      <main className="p-10 text-center">
        <h1 className="text-2xl font-bold">403 - Forbidden</h1>
        <p className="text-muted-foreground mt-2">
          You don't have permission to access this page.
        </p>
      </main>
    );
  }