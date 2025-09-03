// src/app/admin/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Query a few useful stats
  const [productCount, categoryCount, userCount] = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.user.count(),
  ]);

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.email}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border p-4 shadow-sm bg-card">
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="mt-2 text-2xl font-bold">{productCount}</p>
        </div>

        <div className="rounded-xl border p-4 shadow-sm bg-card">
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="mt-2 text-2xl font-bold">{categoryCount}</p>
        </div>

        <div className="rounded-xl border p-4 shadow-sm bg-card">
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="mt-2 text-2xl font-bold">{userCount}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Quick Links</h2>
        <ul className="list-disc pl-6">
          <li>
            <a href="/admin/products" className="text-blue-600 hover:underline">
              Manage Products
            </a>
          </li>
          <li>
            <a href="/admin/categories" className="text-blue-600 hover:underline">
              Manage Categories
            </a>
          </li>
          <li>
            <a href="/admin/users" className="text-blue-600 hover:underline">
              Manage Users
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}
