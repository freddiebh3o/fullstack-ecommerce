# Fullstack E-commerce (Next.js + Prisma)

This project is a **learning-focused fullstack e-commerce application** built with **Next.js 15 (App Router)**, **Prisma ORM**, and **Postgres**.  
It features an **admin panel** with authentication, product/catalog management, and **multi-tenant RBAC (role-based access control)**.  

Uploads are stored in an **S3-compatible bucket** (emulated locally with LocalStack), so you can practice real-world cloud workflows without any AWS billing.  

⚠️ **Note:** This project is strictly for practice and learning. It is **not intended for production**.  

---

## ✨ Feature Summary

- **Authentication & Access**
  - NextAuth.js (credentials provider with JWT sessions)
  - Global system roles: `SUPERADMIN`, `ADMIN`, `USER`
  - Tenant-level roles: `OWNER`, `ADMIN`, `EDITOR`, `READONLY`

- **Admin Dashboard**
  - Tenant-aware stats (products, categories, users)
  - Quick links that only appear if you have the required permissions

- **Product Management**
  - List, create, edit, and delete products
  - Associate products with categories and brands
  - Upload a primary image (stored in S3/LocalStack)
  - Tenant-scoped uniqueness on product slugs

- **Category Management**
  - List, create, edit, and delete categories
  - Slug auto-generation and uniqueness enforcement per tenant
  - Safeguard: cannot delete category if it still has products

- **Brand Management**
  - List, create, edit, and delete brands
  - Upload brand logos
  - Search + pagination support for larger brand catalogs

- **Member Management** *(tenant-scoped)*
  - Owners/Admins can invite new members to a tenant
  - Assign roles (`OWNER`, `ADMIN`, `EDITOR`, `READONLY`)
  - Safeguard: last remaining OWNER cannot be deleted or demoted
  - Editors/Readonly limited appropriately by permissions

- **User Management** *(system-level, Admin/Superadmin only)*
  - Internal users only (developers/staff)
  - List, edit, reset password, or delete global users
  - Safeguards: cannot delete yourself, cannot demote last ADMIN

- **File Uploads**
  - Integrated with LocalStack S3 for safe local development
  - Bucket + object layout simulates real AWS S3 usage

- **UI/UX**
  - Built with Tailwind CSS and shadcn/ui
  - Sidebar navigation with tenant switcher
  - Toast notifications, loading states, and permission-aware UI
  - Consistent error handling (`{ error, code, details }` JSON shape)

- **Database**
  - Prisma ORM with Postgres
  - Multi-tenant scoping via `tenantId` on all core entities
  - Seeding script provides tenants, demo users, roles, products, categories, and brands

---

## 🏗 Architecture & Tech Stack

This project is designed to mirror a **real-world SaaS-style e-commerce platform** with tenant isolation, RBAC, and cloud-like storage.  

### Core Framework
- **Next.js 15** (App Router + TypeScript) for frontend, API routes, and server components.
- **React 18** with client/server components and Suspense support.

### Database
- **Postgres** (local development via Docker or Supabase in the cloud).
- **Prisma ORM** for schema migrations, queries, and type-safety.
- All core entities (`Product`, `Category`, `Brand`, `Image`) are **scoped by `tenantId`**.

### Authentication
- **NextAuth.js v4** with credentials provider.
- Global system roles: `SUPERADMIN`, `ADMIN`, `USER`.
- Tenant-level roles: `OWNER`, `ADMIN`, `EDITOR`, `READONLY`.

### Permissions / RBAC
- Fine-grained permission keys (`product.read`, `product.write`, `member.manage`, etc.).
- Role-permission assignments stored in the DB.
- Helpers:
  - `can(permissionKey, tenantId)`
  - `ensurePagePermission` / `ensureAnyPagePermission` for server components
  - `withTenantPermission` / `withAnyTenantPermission` for API routes
  - `withSystemRole` for system-level (user management) routes

### File Storage
- **AWS S3 API emulated via LocalStack** (Docker).
- Bucket per environment (e.g. `ecom-dev-bucket`).
- Used for product images, brand logos, and tenant assets.

### UI/UX
- **Tailwind CSS** for styling.
- **shadcn/ui** components for consistent design system.
- **Lucide-react** icons.
- Toast notifications, permission-gated buttons/forms.
- Admin sidebar + topbar with tenant switcher.

### Infrastructure (intended)
- **Vercel** (Next.js hosting).
- **Supabase** (Postgres, Auth, Storage, backups).
- **AWS S3 or Supabase Storage** for production file storage.
- Local dev runs everything with Docker (LocalStack + Postgres).

---

## 🏢 Multitenancy & RBAC

This project implements **row-level tenant isolation** and **role-based access control (RBAC)** to mirror how SaaS e-commerce platforms work in production.

### Tenant Model
- Each `Tenant` represents a company/account using the system.
- Global `User` records exist once but can belong to multiple tenants via `Membership`.
- All catalog entities (`Product`, `Category`, `Brand`, `Image`) include a `tenantId` column.
- Database constraints enforce per-tenant uniqueness:
  - `@@unique([tenantId, slug])` for categories, brands, and products.

### Roles & Permissions
- **System-level roles** (global):
  - `SUPERADMIN` → unrestricted access across all tenants.
  - `ADMIN` → can manage tenants and users they belong to.
  - `USER` → must have a membership in a tenant to access anything.
- **Tenant-level roles** (scoped within each tenant):
  - `OWNER` → full access, can manage members/roles.
  - `ADMIN` → manage catalog + members.
  - `EDITOR` → manage catalog only (products, categories, brands).
  - `READONLY` → view-only access.

### Permissions
- Fine-grained permission keys seeded per tenant:
  - `product.read`, `product.write`
  - `category.read`, `category.write`
  - `brand.read`, `brand.write`
  - `member.read`, `member.manage`
- Permissions are assigned to roles via `PermissionAssignment`.

### Safeguards
- Cannot delete or demote the **last OWNER** of a tenant.
- Users cannot delete their own account.
- Global **ADMIN** cannot be demoted if they are the last remaining system admin.

### Enforcement Helpers
- **API routes**:
  - `withTenantPermission("product.write", handler)`
  - `withAnyTenantPermission(["category.read", "category.write"], handler)`
  - `withSystemRole(["ADMIN", "SUPERADMIN"], handler)`
- **Server components**:
  - `ensurePagePermission("brand.write")`
  - `ensureAnyPagePermission(["member.read", "member.manage"])`


### Tenant Switching
- Tenant is resolved via a signed cookie `x-current-tenant-id`.
- `TenantSwitcher` component lets users change their active tenant.
- If no tenant is selected, requests fall back to the first membership or return a **403**.

--- 

## 🗄 Database Models (Tenant, Membership, Role, Permissions)

the RBAC system iss powered by four core models, plus supporting entities. All of these live in `prisma/schema.prisma`

### Tenant
- Represents a company/account in the system.  
- Owns catalog entities (Products, Categories, Brands, Images).
- Has many Memberships (users belonging to the tenant).
- Key fields:
  - `id` (string, primary key, CUID)
  - `name` (string)
  - `slug` (unique per system)

### Membership
- Joins a `User` to a `Tenant` with a given `Role`
- A user can belong to multiple tenants
- Each membership is unique per tenant + user
- Key fields:
  - `id` (string, CUID)
  - `tenantId`
  - `userId` 
  - `roleId` 
- Constraint `@@unique([tenantId, userId])`

### Role
- Defines a set of permissions within a tenant.
- Seeded by default with: `OWNER`, `ADMIN`, `EDITOR`, `READONLY`.
- Each membership is unique per tenant + user
- Key fields:
  - `id` (string, CUID)
  - `tenantId`
  - `key` (`OWNER`, `ADMIN`, `EDITOR`, `READONLY`) 
  - `name` (human-readable label) 
- Constraint `@@unique([tenantId, key])`

### Permission
- Defines fine-grained actions (e.g. `product.read`, `product.write`).
- Seeded once per tenant during bootstrap.
- Key fields:
  - `id`
  - `tenantId`
  - `key` (e.g. product.read) 
- Constraint `@@unique([tenantId, key])`

### PermissionAssignment
- Joins a `Role` to a `Permission`.
- Allows flexible mapping (e.g. `EDITOR` has `product.read` + `product.write` but not `member.manage`).
- Key fields:
  - `roleId`
  - `permissionId`
- Constraint `@@unique([roleId, permissionId])`


## 🔐 Permissions Matrix


Permissions are defined per-tenant and attached to roles (`OWNER`, `ADMIN`, `EDITOR`, `READONLY`).  
They control both **API access** and **UI visibility**.  

| Permission Key     | Controls                                                                 |
|--------------------|--------------------------------------------------------------------------|
| `product.read`     | View product list/details. Required to see products in the admin UI.      |
| `product.write`    | Create, edit, delete products. Enables “New Product” button + table actions. |
| `category.read`    | View category list/details. Required to see categories in the admin UI.   |
| `category.write`   | Create, edit, delete categories. Enables “New Category” button + table actions. |
| `brand.read`       | View brand list/details. Required to see brands in the admin UI.          |
| `brand.write`      | Create, edit, delete brands. Enables “New Brand” button + table actions.  |
| `member.read`      | View members of the current tenant.                                       |
| `member.manage`    | Add/remove members, change roles. Enables “Add Member” and role dropdowns. |

### Role Bundles

| Role       | Granted Permissions                                                                 |
|------------|--------------------------------------------------------------------------------------|
| **OWNER**  | All permissions (`*.read`, `*.write`, `member.manage`). Cannot be demoted/deleted if last OWNER. |
| **ADMIN**  | All permissions (`*.read`, `*.write`, `member.manage`).                             |
| **EDITOR** | `product.read`, `product.write`, `brand.read`, `brand.write`, `category.read`, `category.write`. |
| **READONLY** | `product.read`, `brand.read`, `category.read`, `member.read`.                      |

> **Note:**  
> - Global **SUPERADMIN** bypasses all tenant checks.  
> - Global **ADMIN** can also access the Users tab (internal developer/company accounts).  

## 🚀 Getting Started

Follow these steps to run the project locally.

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
Create a `.env` file in the project root:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/dbname"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret"

# LocalStack S3 emulation
S3_ENDPOINT="http://localhost:4566"
S3_BUCKET="ecom-dev-bucket"
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
```

### 3. Prisma setup 
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 4. Run LocalStack (S3 Emulator)
Start the LocalStack Docker container:
```bash
docker compose up -d
```
then create the development bucket once inside the container 
```bash
docker exec -it localstack bash
awslocal s3 mb s3://ecom-dev-bucket
```
The bucket will now be available at:
```bash
http://s3.localhost.localstack.cloud:4566/ecom-dev-bucket
```

### 5. Run the development server
```bash
npm run dev
```

### 6. Default Admin login
Use the seeded admin credentials:
```
Email: admin@example.com
Password: Admin123!
```
Log in at `http://localhost:3000/login`

### 7. Useful developer scripts
```bash
# Regenerate Prisma client
npx prisma generate

# Reset DB (drops all data, re-applies migrations, re-seeds)
npx prisma migrate reset

# Inspect/edit data in a UI
npx prisma studio

# Copying file structure without showing node modules or git files
node print-tree.mjs . "node_modules,.git,.next,dist" 5
```

---

## 📂 Directory Structure

The project follows a standard **Next.js App Router** layout with additional folders for Prisma, scripts, and LocalStack configuration.
```text
+---.localstack
|   +---cache
|   |   +---machine.json
|   |   +---server.test.pem
|   |   +---server.test.pem.crt
|   |   \---server.test.pem.key
|   +---lib
|   +---logs
|   \---tmp
+---localstack-init
|   \---init-s3.sh
+---prisma
|   +---migrations
|   |   +---20250902222844_init
|   |   |   \---migration.sql
|   |   +---20250902224148_add_user_model
|   |   |   \---migration.sql
|   |   +---20250903124712_categories_crud
|   |   |   \---migration.sql
|   |   +---20250906203701_add_multitenancy_and_rbac_2
|   |   |   \---migration.sql
|   |   +---20250906213200_tenant_scoped_slug_uniques
|   |   |   \---migration.sql
|   |   +---20250906215224_add_superadmin_role
|   |   |   \---migration.sql
|   |   +---20250906234105_drop_global_slug_uniques
|   |   |   \---migration.sql
|   |   +---20250907213354_add_audit_log
|   |   |   \---migration.sql
|   |   \---migration_lock.toml
|   +---schema.prisma
|   \---seed.ts
+---public
|   +---file.svg
|   +---globe.svg
|   +---next.svg
|   +---vercel.svg
|   \---window.svg
+---scripts
|   \---fix-roles.js
+---src
|   +---app
|   |   +---403
|   |   |   \---page.tsx
|   |   +---actions
|   |   |   +---is-system-admin.ts
|   |   |   +---perm.ts
|   |   |   \---tenant.ts
|   |   +---admin
|   |   |   +---brands
|   |   |   |   +---[id]
|   |   |   |   +---new
|   |   |   |   \---page.tsx
|   |   |   +---categories
|   |   |   |   +---[id]
|   |   |   |   +---new
|   |   |   |   \---page.tsx
|   |   |   +---members
|   |   |   |   +---new
|   |   |   |   \---page.tsx
|   |   |   +---products
|   |   |   |   +---[id]
|   |   |   |   +---new
|   |   |   |   \---page.tsx
|   |   |   +---users
|   |   |   |   +---[id]
|   |   |   |   +---new
|   |   |   |   \---page.tsx
|   |   |   +---layout.tsx
|   |   |   +---loading.tsx
|   |   |   \---page.tsx
|   |   +---api
|   |   |   +---admin
|   |   |   |   +---brands
|   |   |   |   +---categories
|   |   |   |   +---members
|   |   |   |   +---products
|   |   |   |   +---tenant
|   |   |   |   +---uploads
|   |   |   |   \---users
|   |   |   \---auth
|   |   |       \---[...nextauth]
|   |   +---login
|   |   |   \---page.tsx
|   |   +---favicon.ico
|   |   +---globals.css
|   |   +---layout.tsx
|   |   \---page.tsx
|   +---components
|   |   +---admin
|   |   |   +---admin-sidebar.tsx
|   |   |   +---admin-user-menu.tsx
|   |   |   +---brand-search.tsx
|   |   |   +---brand-select.tsx
|   |   |   +---brand-table.tsx
|   |   |   +---category-select.tsx
|   |   |   +---category-table.tsx
|   |   |   +---edit-brand-form.tsx
|   |   |   +---edit-category-form.tsx
|   |   |   +---edit-product-form.tsx
|   |   |   +---edit-user-form.tsx
|   |   |   +---image-uploader.tsx
|   |   |   +---member-table.tsx
|   |   |   +---new-brand-form.tsx
|   |   |   +---new-category-form.tsx
|   |   |   +---new-member-form.tsx
|   |   |   +---new-product-form.tsx
|   |   |   +---new-user-form.tsx
|   |   |   +---product-table.tsx
|   |   |   +---tenant-switcher.tsx
|   |   |   +---TenantCookieGuard.tsx
|   |   |   \---user-table.tsx
|   |   +---auth
|   |   |   \---sign-out-button.tsx
|   |   +---theme
|   |   |   +---admin-theme-provider.tsx
|   |   |   \---theme-toggle.tsx
|   |   \---ui
|   |       +---button.tsx
|   |       +---card.tsx
|   |       +---form.tsx
|   |       +---global-loading.tsx
|   |       +---input.tsx
|   |       +---label.tsx
|   |       +---pagination.tsx
|   |       +---select.tsx
|   |       +---spinner.tsx
|   |       \---toast-provider.tsx
|   +---lib
|   |   +---api
|   |   |   +---client.ts
|   |   |   +---context.ts
|   |   |   +---index.ts
|   |   |   \---response.ts
|   |   +---audit
|   |   |   +---audit.ts
|   |   |   \---index.ts
|   |   +---auth
|   |   |   +---guards
|   |   |   |   +---api.ts
|   |   |   |   +---page.ts
|   |   |   |   \---system.ts
|   |   |   +---index.ts
|   |   |   +---nextauth.ts
|   |   |   \---permissions.ts
|   |   +---db
|   |   |   +---index.ts
|   |   |   +---prisma.ts
|   |   |   \---tenant-db.ts
|   |   +---storage
|   |   |   +---index.ts
|   |   |   \---s3.ts
|   |   +---tenant
|   |   |   +---bootstrap.ts
|   |   |   +---index.ts
|   |   |   \---resolve.ts
|   |   \---utils
|   |       +---index.ts
|   |       +---misc.ts
|   |       \---slug.ts
|   +---styles
|   |   +---admin-theme.css
|   |   \---nprogress.css
|   \---middleware.ts
+---types
|   \---next-auth.d.ts
+---.env
+---.env.example
+---.gitignore
+---components.json
+---docker-compose.yml
+---eslint.config.mjs
+---next-env.d.ts
+---next.config.ts
+---package-lock.json
+---package.json
+---postcss.config.mjs
+---print-tree.mjs
+---README.md
\---tsconfig.json
```
--- 

## ☁️ Hosting & Infrastructure Costs

This project is designed for cloud hosting using **Vercel (Next.js)**, **Supabase (Postgres/Auth/Storage)**, and **S3-compatible storage**.  
Below are estimated monthly costs at different scales. These are **not actual bills**, but learning-oriented ballpark figures.

### Frontend + API (Next.js)
- **Vercel Pro**: $20 per developer/month  
  Includes: SSR/ISR, API routes, CDN, custom domains, SSL.  
- Alternative: self-host via **AWS EC2** or **DigitalOcean Droplet** (~$5–$20/month).  

👉 **Typical budget:** $20–$50/month

### Database (Supabase Postgres)
- **Free tier:** 500MB storage, 50k requests/month.  
- **Pro tier:** $25/month → 8GB storage, 8GB bandwidth.  
- Scales with storage:  
  - 50GB DB → ~$100/month  
  - 200GB DB → ~$400/month  

👉 **Typical budget:** $25–$100/month initially

### Storage (Product images, logos, docs)
- AWS S3 pricing: **$0.023/GB stored** + **$0.09/GB egress**.  
- Example usage:  
  - 10k images (500KB avg) → 5GB = ~$0.12/month  
  - 100k images → 50GB = ~$1.15/month  
- Bandwidth/downloads are the main cost driver.  

👉 **Typical budget:** $5–$25/month

### Authentication & Emails
- **NextAuth.js**: free.  
- OAuth providers (Google, Microsoft, GitHub, etc.): free.  
- Transactional email (Postmark, SendGrid, etc.): ~$15–$50/month depending on volume.  

👉 **Typical budget:** $0–$30/month

### Estimated Totals
- **Small project / dev use:** ~$50–$100/month  
- **Growing tenant base:** ~$150–$300/month  
- **Enterprise scale (PITR, high storage, backups):** $500–$800/month  

---

## 🗄️ Database Backups & Snapshots

This project uses **Postgres via Supabase** in development/production.  
Protecting tenant-scoped data requires a reliable backup and recovery strategy.

### Daily Automated Backups (included)
- **Supabase Pro Plan**: 1 daily backup retained for 7 days  
- **Team Plan**: retained for 14 days  
- **Enterprise Plan**: retained up to 30 days  
- No additional cost — included with the base plan.  
- Restores are full-database only (not per-tenant).

### Point-in-Time Recovery (PITR) — Optional Add-on
- Allows restoring to *any second* within the configured retention window.  
- Useful for tenant data recovery after accidental deletes/updates.  
- Billed hourly for the period PITR is enabled.

| Retention | Approx Monthly Cost* | Notes |
|-----------|-----------------------|-------|
| 7 days    | ~$100/month           | Suitable for dev/test or low-risk prod |
| 14 days   | ~$200/month           | Balance of cost vs safety |
| 28 days   | ~$400/month           | High assurance for enterprise |

\* Example based on full activation for a 744-hour month.

### Summary Table

| Backup Type                | Included? | Retention     | Granularity | Cost                 |
|-----------------------------|-----------|---------------|-------------|----------------------|
| **Daily Backups**           | ✅        | 7/14/30 days  | 1/day       | Free (in plan)       |
| **PITR (add-on)**           | ❌        | 7–28 days     | Per-second  | $100–$400/month      |

### Recommendations
- For **learning/dev**: daily automated backups are more than enough.  
- For **production tenants**: enable PITR at least 7–14 days for safety against user error.  
- Always test restore workflows before relying on them in real deployments.  

---

## 🌱 Seed Data & Test Accounts

The Prisma seed script (`prisma/seed.ts`) bootstraps a **demo environment** with tenants, users, roles, permissions, and some catalog data.  
This makes it easy to log in and test tenant/permission flows without manual setup.

### Tenants Created
- **default** → baseline demo tenant  
- **acme** → second tenant for cross-tenant testing  

Each tenant is seeded with:
- Core roles: `OWNER`, `ADMIN`, `EDITOR`, `READONLY`  
- Permission assignments (scoped CRUD access for products, categories, brands, members)  
- Example categories, brands, and products

### Demo Users
The seed script creates several users and memberships:

| Email                       | Password   | Global Role   | Tenant Memberships |
|-----------------------------|------------|---------------|--------------------|
| **superadmin@example.com**  | Super123!  | SUPERADMIN    | All tenants (OWNER) |
| **admin@example.com**       | Admin123!  | ADMIN         | `default` tenant (OWNER) |
| **owner+default@example.com** | Owner123! | USER          | `default` tenant (OWNER) |
| **editor@example.com**      | Editor123! | USER          | `default` tenant (EDITOR) |
| **readonly@example.com**    | Read123!   | USER          | `default` tenant (READONLY) |

> ℹ️ You can tweak these accounts or add more by editing `prisma/seed.ts`.

### Debug Logging
At the end of `seed.ts`, the script prints each user’s **effective permissions per tenant** so you can verify roles were applied correctly. Example:

```
User: owner+default@example.com

Tenant: default
Effective perms: category.read, category.write, product.read, product.write, ...
```

### Usage
- Log in with **superadmin@example.com / Super123!** to switch between tenants.  
- Try creating/deleting products and categories as different roles to confirm the permission system.  
- Use `npx prisma migrate reset` to reset + reseed everything if you need a clean slate.

---

## 🖥️ Admin Dashboard

The **Dashboard** is the landing page of the admin panel.  
It gives each user a quick overview of their tenant’s data and provides shortcuts to the modules they are allowed to access.

### Features
- **Welcome header** with the logged-in user’s email.
- **At-a-glance stats** for key entities:
  - Total Products
  - Total Categories
  - Total Users (system-wide, Admin/Superadmin only)
- **Quick Links** section:
  - Links appear **conditionally** based on the user’s permissions.
  - Example:  
    - `product.read` → shows *Manage Products*  
    - `category.read` → shows *Manage Categories*  
    - `brand.read` → shows *Manage Brands*  
    - `member.read` → shows *Manage Members*  
    - `system:users` (Admin/Superadmin only) → shows *Manage Users*

### UX / UI
- Clean **card-based layout** (Tailwind + shadcn/ui).  
- Grid adapts responsively (1 column → 2 columns → 3 columns).  
- Cards highlight counts in bold for quick scanning.  
- Quick Links styled as underlined shortcuts for faster navigation.

### Permissions
- Dashboard itself is always visible after login.  
- **Cards & links respect RBAC**:  
  - A user without `product.read` won’t see *Products* stats or links.  
  - Members with `READONLY` roles still see dashboard counts but not management links.  
  - Global *Users* tab is only visible to `ADMIN` and `SUPERADMIN`.

---

## API Hardening
This project enforces `multitenant isolation`, `role/permission checks` and `consistent error handling` across all `/api/admin` routes. Below is how it's wired and what to watch for when adding new endpoints.

### Route guards (who can call the route?)
- **Tenant-scoped permissions**
  - `withTenantPermission("x.")` - require a specific permission within the current tenant (e.g. product.write).
  - `withAnyTenantPermission(["a.b", "c.d"])` - allow access if the user holds any of the listed permissions in the current tenant.
- **System-level roless (global)**
  - `withSystemRole(["ADMIN", "SUPERADMIN"])` - restrict endpoints to internal operators on (e.g. "Users" module).

Examples:
```ts
// Brand CRUD (tenant-scoped)
export const POST = withTenantPermission("brand.write", async (req, { db, tenantId, session }) => { /*...*/ });

// Category listing (read OR write allowed)
export const GET = withAnyTenantPermission(["category.read", "category.write"], async (req, ctx) => { /*...*/ });

// Users API (internal only)
export const DELETE = withSystemRole(["ADMIN","SUPERADMIN"], async (req, { session }) => { /*...*/ });
```

### Tenant Context (what data can they touch?)
- All queries must be explicitly scoped by `tenantId`
- For lookups/mutations by ID, verify `{ id, tenantId } together
  - If the record doesn't belong to the current tenant -> return 404 (not 403) to avoid disclosing cross-tenant existence.
- Uniqueness (like slugs) must be enforced per-tenant, never globally

Patterns:
```ts
// Read by id (scoped)
const row = await db.category.findFirst({ where: { id, tenantId } });
if (!row) return error(404, "NOT_FOUND", "Category not found");

// Per-tenant slug uniqueness
const exists = await db.brand.findFirst({ where: { tenantId, slug: normalizedSlug, NOT: { id } } });
if (exists) return error(409, "CONFLICT", "Slug already exists in this tenant");

```

### Validation (don’t trust inputs)
- Use Zod for all request bodies and query params.
- Return 400 with the flattened Zod error when invalid.
- Normalize/trim strings (e.g., `slugify()`, `String.trim())`, and enforce patterns: `^[a-z0-9-]+$`.

Patterns
```ts
const bodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug can only contain a-z, 0-9 and hyphens"),
});

const parsed = bodySchema.safeParse(await req.json());
if (!parsed.success) return error(400, "VALIDATION", "Invalid request body", parsed.error.flatten());
```

### Error responses (consistent shape)
All endpoints return a consistent JSON structure via helpers:
- `ok(data, opts?)` → success
- `error(status, code, message, details?)` → failure

### Conventions
- 401 UNAUTHENTICATED – no session/invalid auth
- 403 FORBIDDEN – authenticated but missing permission/role
- 404 NOT_FOUND – not found or belongs to a different tenant
- 409 CONFLICT – unique constraint or business rule conflict
- 400 VALIDATION/BAD_REQUEST – schema or field-level validation error

### Auditing (who did what, when?)
- Sensitive writes call audit(db, tenantId, session.user.id, action, payload).
- Currently used in Brands & Categories CRUD (brand.create/update/delete, category.create/update/delete).
- Do the same for Products/Members where appropriate.

### Pagination, search & sorting (avoid heavy scans)
- Use a query schema for GET endpoints (e.g., q, page, limit, sort).
- Whitelist sort fields/directions.
- Always cap limit (e.g., max 100).

```ts
const querySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt:desc", "createdAt:asc", "name:asc", "name:desc"]).default("createdAt:desc"),
});
```

### Next.js App Router (dynamic params)
- In route handlers, Next 15 passes req only—parse the id from the URL if needed:
```ts
const url = new URL(req.url);
const id = url.pathname.split("/").pop() || "";
```
- In server pages, dynamic `params` are async:
```ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Safeguards (business rules)
- Members: can’t demote/remove the last OWNER in a tenant.
- Users (system-level): can’t delete yourself; can’t demote the last ADMIN.
- Ownership escalation: Only OWNER (in-tenant) or global ADMIN/SUPERADMIN can promote to OWNER.
Enforce these in API routes with clear 400 errors when blocked.

### Authorization on the client (defense in depth)
- Use Server actions (canWriteX, canManageMembers) to hide/disable UI controls.
- Never rely on UI alone—server routes must still enforce permissions.

### Do / Don’t
✅ Do include { tenantId } in every where-clause for tenant data.
✅ Do validate all inputs with Zod; normalize/trim strings.
✅ Do return 404 for cross-tenant IDs (don’t leak existence).
✅ Do audit sensitive writes.
❌ Don’t accept arbitrary fields (whitelist with Zod).
❌ Don’t sort by untrusted fields; whitelist sort values.
❌ Don’t expose internal error messages; use structured error().

### Mini checklist for new endpoints
- [] Choose the correct guard: withTenantPermission / withAnyTenantPermission / withSystemRole.
- [] Parse and validate params/body with Zod.
- [] Scope every read/write by { tenantId }.
- [] Enforce per-tenant uniqueness (use NOT: { id } on updates).
- [] Return consistent error() responses.
- [] Add audit() for create/update/delete.
- [] Limit results & validate sorting for list endpoints.

---

## 🗺️ Roadmap / Epics

This section tracks which larger feature areas (Epics) have already been integrated, and which are still on the roadmap.

---

### ✅ Completed Epics

#### Epic: Tenant & Permissions Foundation
- [x] Add `Tenant`, `Membership`, `Role`, `Permission`, and `PermissionAssignment` models.  
- [x] Bootstrap roles per tenant (`OWNER`, `ADMIN`, `EDITOR`, `READONLY`).  
- [x] Implement `getCurrentTenantId` helper (session/cookie/membership fallback).  
- [x] Add tenant switcher UI + API.  
- [x] Scope all admin CRUD operations to `tenantId`.  
- [x] Ensure slug uniqueness per-tenant (`@@unique([tenantId, slug])`).  
- [x] Implement role-based permission checks (`can()` helper).  
- [x] Add safeguards against deleting/demoting last OWNER.  
- [x] Seed two tenants with example users, roles, and catalog. 

#### Epic: Members & Roles
- [x] Tenant members CRUD (list, add, edit role, remove).  
- [x] Owners/Admins can promote/demote members.  
- [x] Safeguards: last OWNER cannot be deleted/demoted.  
- [x] Role assignment limited: only OWNERS, ADMIN, SUPERADMIN may grant `OWNER`.  

#### Epic: Users (System-level)
- [x] Restricted to global `ADMIN` / `SUPERADMIN`.  
- [x] List, create, edit, delete system users.  
- [x] Safeguards: cannot delete self, cannot demote last system ADMIN.  

#### Epic: Admin Dashboard
- [x] Dashboard page with basic stats (products, categories, users).  
- [x] Quick Links respect permission checks.  
- [x] Cards/UI styled with Tailwind + shadcn components.  

---

#### Epic: Catalog Structure
- [x] Admins can create brands (name, slug, logo, description, website).  
  - [x] Brands table with search + pagination  
  - [x] Brand create/edit forms with slug auto-gen + URL validation  
  - [x] Brand logo upload via drag-and-drop with preview  
  - [x] Toast notifications for success/error  
  - [x] Brand column in product list  
- [x] Admins can create categories (name, slug).  
  - [x] Categories table with search + pagination  
  - [x] Category create/edit forms with slug auto-gen  
  - [x] Category delete safeguards when in use  

#### Epic: Products
- [x] Tenant-scoped CRUD for products (list, create, edit, delete).
- [x] Product table with delete confirmation + toast notifications.
- [x] New product form with category/brand select.
- [x] Edit product form with initial values, update handling, and image support.
- [x] Permissions enforced:
  - `product.read` required for viewing
  - `product.write` required for create/edit/delete
- [x] API routes protected with `withTenantPermission` / `withAnyTenantPermission`.
- [x] Slug uniqueness enforced per tenant.
- [x] Product table actions gated with `PermissionGate` -> REMOVED.


### 🚧 Planned Epics

===ACTIVITY TIMEOUTS===

#### Epic: Custom Roles & Permissions

**Scope:** Allow tenant OWNER/ADMIN users (and system-level Admin/Superadmin) to define custom roles with fine-grained permissions, beyond the default seeded roles (`OWNER`, `ADMIN`, `EDITOR`, `READONLY`).

**Features (RBAC: OWNER/ADMIN/system only)**  
- [ ] Add `CustomRole` model linked to tenant.  
- [ ] UI for creating/editing custom roles with name + description.  
- [ ] Assign a set of permissions (checkboxes: `product.read`, `product.write`, `category.write`, etc).  
- [ ] Custom roles appear alongside default roles in role selectors.  
- [ ] Members can be assigned custom roles the same way as defaults.  
- [ ] Safeguards:  
  - Cannot remove all access (at least one permission required).  
  - Last `OWNER` safeguard still applies.  
  - System Admin/Superadmin can always override.  
- [ ] Audit logs for role creation, update, and assignment.  
- [ ] (Optional later) Role cloning — copy permissions from an existing role.  

**Features (RBAC: OWNER/ADMIN only)**  
- [ ] Tenant can upload an **admin logo** (shown in sidebar/header).  
- [ ] Tenant can configure **admin theme colors** (accent, sidebar, background, etc).  
- [ ] Branding settings stored per-tenant in the database.  
- [ ] Admin UI loads tenant branding automatically on login/tenant switch.  
- [ ] Changes apply instantly across the admin panel (via theme provider/context).  
- [ ] Safeguards: only OWNER/ADMIN roles can update branding.  
- [ ] Fallback to default theme if tenant branding not configured.  
- [ ] Audit log entries for branding updates (who changed what, when).  

#### Epic: Storefront CMS & Branding

**Scope:** Allows tenant OWNER/ADMIN users to customize their public-facing storefront with branding and content.

**Features (RBAC: OWNER/ADMIN only)**  
- [ ] Upload **storefront logo** and **favicon**.  
- [ ] Configure **brand colors**, typography, and theme tokens for storefront.  
- [ ] Manage **homepage content** (hero, banners, featured products).  
- [ ] Manage **CMS pages** (About, Contact, FAQs, etc).  
- [ ] Assets stored under `tenants/<tenantId>/storefront/...` in S3.  
- [ ] Storefront dynamically applies tenant branding and content at runtime.  
- [ ] (Optional later) Custom domains or subdomains per tenant (`tenant.example.com`).  

#### Epic: Branches/Locations
- [ ] Add `Branch` model linked to tenant.  
- [ ] Products can be branch-specific (optional).  
- [ ] Orders can select branch for fulfillment.  
- [ ] Customers can have preferred branch.  
- [ ] Feature flag per tenant/plan.  

#### Epic: Product Media & Details
- [ ] Admins can upload multiple images for a product, reorder them, and set alt text.
- [ ] Admins can delete a product image.
- [ ] Admins can set product status (Draft/Active/Archived) and schedule publish.
- [ ] Admins can add compare-at price and cost price.

#### Epic: Product Data Modeling
- [ ] Admins can define product options (Size, Color) and generate variants.
- [ ] Admins can set variant-level stock and price.
- [ ] Admins can add product attributes/specs (key/value).

#### Epic: Product List UX
- [ ] Admins can search and filter products by text, category, brand, tag, status.
- [ ] Admins can paginate and sort the product list.
- [ ] Admins can bulk-select products and apply actions (publish/unpublish/delete).

#### Epic: Categories UX
- [ ] Admins can view categories in a tree and reorder them.
- [ ] Admins can hide categories without deleting.
- [ ] Admins see product counts per category including subcategories.

#### Epic: Brands & Tags UX
- [ ] Admins can search and paginate brands, see product counts.
- [ ] Admins can merge duplicate tags.
- [ ] Admins can create tags and attach them to products.

#### Epic: Customers (B2B accounts)
- [ ] Admins can create customers with details (name, contact, billing info).  
- [ ] Customers can have traits/contracts (price overrides, credit terms, max order size).  
- [ ] Portal customers can log in, view pricing, place orders.  
- [ ] Admins can view orders per customer across branches.  

#### Epic: Suppliers
- [ ] Admins can create suppliers (name, contact, product catalog).  
- [ ] Products linked to suppliers (cost-side relationship).  
- [ ] Supplier management (min order qty, lead times, cost price).  
- [ ] Purchase orders raised against suppliers.  
- [ ] Supplier reporting (spend, stock, performance).  

#### Epic: Admin UX Polish
- [ ] All forms use toast notifications instead of alerts.
- [ ] Sticky save bar on long forms.
- [ ] Unsaved changes warning before navigation.

#### Epic: Integrity & Safety
- [ ] Audit log of recent changes (who/what/when).
- [ ] Export tenant data (JSON/CSV).
- [ ] Rate-limit sensitive ops per tenant.
- [ ] Cannot delete categories with products unless reassigning.

---

## 🛠️ Troubleshooting & Tips

This project is still evolving, and a few common issues can crop up during local development.  

### 1. Prisma Client not generated
If you see errors like *“`@prisma/client` did not initialize”*, regenerate the client:

```bash
# Regenerate Prisma client
npx prisma generate

```

---

### 2. Resetting the database
When migrations or seed data get out of sync, reset the DB completely:

```bash
# WARNING: Drops all data, re-applies migrations, and runs seed (if configured)
npx prisma migrate reset

```

This will **drop all data**, re-apply migrations, and run the seed script.

---

### 3. Inspect/edit data
To quickly view or edit records in your Postgres database, use Prisma Studio:

```bash
npx prisma studio
```

---

### 4. NextAuth JWT decryption errors
If login suddenly fails with errors like *“JWT decryption failed”*:
- Make sure `NEXTAUTH_SECRET` is set in your `.env`.  
- Restart the dev server after updating it.  
- If issues persist, clear cookies for `localhost:3000`.

---

### 5. LocalStack S3 bucket missing
If uploads fail with *“NoSuchBucket”*, ensure your development bucket exists inside the LocalStack container:

```bash
# Open a shell inside the LocalStack container (container name is usually 'localstack')
docker exec -it localstack bash

# Inside the container:
awslocal s3 mb s3://ecom-dev-bucket
exit

```

---

### 6. LocalStack service not running
If requests to `http://localhost:4566` fail:
- Confirm Docker is running.  
- Start LocalStack manually:

```bash
# Start services (including LocalStack) in the background
docker compose up -d

# Verify LocalStack is running
docker ps --filter "name=localstack"

# (Optional) Restart just LocalStack if needed
docker compose restart localstack
```

---

### 7. Tenant cookie missing
If you see “No tenant selected” in the admin UI:
- Switch tenants using the **Tenant Switcher** dropdown.  
- Check that the cookie `x-current-tenant-id` is being set in your browser dev tools.  
- Removing the cookie falls back to your first available tenant membership.

---

### 8. Common safeguards
- You **cannot delete yourself** from the Users or Members tables.  
- You **cannot demote or remove the last OWNER** of a tenant.  
- System `ADMIN` users cannot be demoted if they are the last one in the global system.  

These rules are enforced at both the API and UI level.

---

## 🛠️ Scripts & Developer Utilities

This project includes several helper scripts and Prisma commands to make development and testing easier.  

### Prisma
- **Generate Prisma client**  
  Keeps the TypeScript client in sync with your schema.  
```bash
npx prisma generate
```

- **Reset the database**  
  Drops all data, reapplies migrations, and runs the seed script.  
```bash
npx prisma migrate reset
```

- **Inspect or edit data with Prisma Studio**  
  GUI for browsing and editing the database.  
```bash
npx prisma studio
```

### LocalStack
- **Start LocalStack (S3 emulator)**  
  Runs a local AWS S3-compatible service in Docker.  
```bash
docker compose up -d
```

- **Create the development bucket**  
  Run once inside the LocalStack container.  
```bash
awslocal s3 mb s3://ecom-dev-bucket
```

### Custom Scripts
- **Fix roles script**  
  Ensures tenant roles and permissions are seeded or repaired if migrations change.  
```bash
node scripts/fix-roles.js
```

### Notes
- These commands are safe for local development.  
- Running `reset` will erase **all data** in your local database.  
- Always re-run `prisma generate` if you update `schema.prisma`.  
```bash
node print-tree.mjs . "node_modules,.git,.next,dist" 5
```

---

## 🔒 Security Notes

⚠️ **Important:** This project is a learning exercise only. It is **not intended for production use**.

- **Authentication**
  - Uses **NextAuth (credentials)** with bcrypt-hashed passwords.
  - JWT sessions are encrypted with `NEXTAUTH_SECRET`.  
    → If this value changes, all users will be logged out.  

- **Multitenancy isolation**
  - All CRUD operations are scoped to the active `tenantId` via helpers (`getCurrentTenantId`, `tenantDb`, `getApiTenantCtx`).  
  - API routes enforce tenant checks with guards (`withTenantPermission`, `withAnyTenantPermission`).  
  - Cross-tenant access attempts result in **403 Forbidden** or **404 Not Found**.

- **Role-based access control (RBAC)**
  - Each tenant has `OWNER`, `ADMIN`, `EDITOR`, `READONLY` roles with predefined permissions.  
  - Safeguards prevent **demoting or deleting the last OWNER** of a tenant.  
  - Global `SUPERADMIN` bypasses tenant restrictions (developer use only).  
  - Global `ADMIN`/`SUPERADMIN` are the only accounts that can access the **Users** tab (system-wide user management).

- **System Admin protections**
  - Cannot delete your own account.
  - Cannot demote the last global `ADMIN`.
  - Safeguards prevent lockouts at both system and tenant levels.

- **File uploads**
  - Stored in S3 (emulated with LocalStack in dev).  
  - User-provided filenames are sanitized and slugified to prevent path traversal.  

- **Validation & errors**
  - All API routes validate request bodies with **Zod**.  
  - Error responses follow a consistent JSON shape:  
    ```json
    { "error": "Forbidden", "code": "FORBIDDEN", "details": { ... } }
    ```

- **Non-production warning**
  - No rate limiting, audit logging, or password reset flows are implemented.  
  - For practice only—**do not deploy with real user data**.
