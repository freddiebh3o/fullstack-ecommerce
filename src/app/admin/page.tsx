// src/app/admin/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { tenantDb } from "@/lib/db/tenant-db";
import { db as systemDb } from "@/lib/db/prisma";
import { getCurrentTenantId } from "@/lib/tenant/resolve";
import { canAny } from "@/lib/auth/permissions";
import { ensureSystemRole } from "@/lib/auth/guards/system";
import { Package, Tags, Bookmark, Users, UserPlus } from "lucide-react";

function Card({
  href,
  title,
  count,
  icon,
  cta,
}: {
  href: string;
  title: string;
  count?: number | null;
  icon?: React.ReactNode;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border p-2 text-muted-foreground group-hover:text-foreground">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            {typeof count === "number" ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {count} item{count === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        </div>
        <span className="text-sm text-primary/70 group-hover:text-primary">
          {cta ?? "Open →"}
        </span>
      </div>
    </Link>
  );
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const tenantId = await getCurrentTenantId();

  // If no tenant is selected, show a gentle nudge. Dashboard itself is viewable by default.
  if (!tenantId) {
    return (
      <main className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome{session?.user?.email ? `, ${session.user.email}` : ""}.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">No tenant selected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a tenant from the header to view tenant data.
          </p>
        </div>
      </main>
    );
  }

  // Permission checks (tenant-scoped)
  const [canProducts, canCategories, canBrands, canMembers] = await Promise.all([
    canAny(["product.read", "product.write"], tenantId),
    canAny(["category.read", "category.write"], tenantId),
    canAny(["brand.read", "brand.write"], tenantId),
    canAny(["member.read", "member.manage"], tenantId),
  ]);

  // System role (Users is a system-level area for SUPERUSER only)
  const maySeeUsers = (await ensureSystemRole(["SUPERUSER"])).allowed;

  // Fetch counts (tenant-scoped where applicable)
  const { db } = await tenantDb(); // scoped client
  const [productCount, categoryCount, brandCount, memberCount, userCount] = await Promise.all([
    canProducts ? db.product.count({ where: {} }) : Promise.resolve(null),
    canCategories ? db.category.count({ where: {} }) : Promise.resolve(null),
    canBrands ? db.brand.count({ where: {} }) : Promise.resolve(null),
    canMembers ? db.membership.count({ where: {} }) : Promise.resolve(null),
    maySeeUsers ? systemDb.user.count() : Promise.resolve(null), // system-wide
  ]);

  return (
    <main className="p-6 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{session?.user?.email ? `, ${session.user.email}` : ""}.
        </p>
      </div>

      {/* Primary tiles */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {canProducts && (
          <Card
            href="/admin/products"
            title="Products"
            count={productCount}
            icon={<Package className="h-5 w-5" />}
          />
        )}
        {canCategories && (
          <Card
            href="/admin/categories"
            title="Categories"
            count={categoryCount}
            icon={<Tags className="h-5 w-5" />}
          />
        )}
        {canBrands && (
          <Card
            href="/admin/brands"
            title="Brands"
            count={brandCount}
            icon={<Bookmark className="h-5 w-5" />}
          />
        )}
        {canMembers && (
          <Card
            href="/admin/members"
            title="Members"
            count={memberCount}
            icon={<UserPlus className="h-5 w-5" />}
          />
        )}
        {maySeeUsers && (
          <Card
            href="/admin/users"
            title="Users (system)"
            count={userCount}
            icon={<Users className="h-5 w-5" />}
          />
        )}
      </div>

      {/* Quick actions (only show what they can access) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {canProducts && (
            <Link
              href="/admin/products/new"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-accent"
            >
              New Product
            </Link>
          )}
          {canCategories && (
            <Link
              href="/admin/categories/new"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-accent"
            >
              New Category
            </Link>
          )}
          {canBrands && (
            <Link
              href="/admin/brands/new"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-accent"
            >
              New Brand
            </Link>
          )}
          {canMembers && (
            <Link
              href="/admin/members/new"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-accent"
            >
              Add Member
            </Link>
          )}
          {maySeeUsers && (
            <Link
              href="/admin/users/new"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-accent"
            >
              Create User
            </Link>
          )}
        </div>
        {!(canProducts || canCategories || canBrands || canMembers || maySeeUsers) && (
          <p className="text-sm text-muted-foreground">
            You don't have access to any modules yet. Ask an admin for permissions.
          </p>
        )}
      </section>
    </main>
  );
}
