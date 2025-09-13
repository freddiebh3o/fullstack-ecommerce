# Fullstack E‑commerce (Next.js + Prisma)

> **Updated 2025-09-13.** A learning-focused, multi-tenant e‑commerce admin built with **Next.js** and **Prisma/Postgres**, featuring RBAC, per‑tenant branding, LocalStack S3 uploads, and consistent API patterns. **Not for production.**

---

## Overview

This repository mirrors a real SaaS back‑office:
- **Next.js 15 (App Router, TypeScript)** for UI + API routes
- **Prisma  / @prisma/client ** over **Postgres**
- **NextAuth ** with credentials + JWT sessions
- **Tailwind + shadcn/ui** for fast UI
- **LocalStack (S3)** for local file storage that feels like AWS
- **RBAC** with both default roles and **custom roles**
- **Per‑tenant admin branding** (logo + theme tokens)
- **Audit logging** for sensitive writes

---

## Feature Summary

### Authentication & Access
- Credentials auth (NextAuth) with encrypted JWT sessions.
- Global roles: `SUPERADMIN`, `ADMIN`, `USER`.
- Tenant roles: `OWNER`, `ADMIN`, `EDITOR`, `READONLY` **+ Custom Roles** (if enabled).

### Multitenancy
- Tenant resolved from cookie `x-current-tenant-id` (fallback to first membership).
- All catalog entities include `tenantId`.
- Per‑tenant uniqueness for slugs: `@@unique([tenantId, slug])`.

### Admin Modules
- **Dashboard**: permission-aware quick links + counts.
- **Products**: CRUD, brand/category relations, image upload to S3, per‑tenant slugs.
- **Categories**: CRUD, safeguards when in use.
- **Brands**: CRUD, logo upload, search + pagination.
- **Members**: invite/remove, assign roles, last‑OWNER safeguards.
- **Users (system)**: Admin/Superadmin‑only, cannot delete self / last ADMIN.
- **Roles**: Create/update/delete roles **and custom roles** with checkbox permissions.
- **Admin Branding**: per‑tenant logo + theme variables via CSS custom props.

### API Hardening
- Zod validation on all inputs.
- Guard helpers: `withTenantPermission`, `withAnyTenantPermission`, `withSystemRole`.
- **Scope every query** with `{ tenantId }`. Return **404** for cross‑tenant IDs.
- Structured errors: `{ error, code, details }`.

### Auditing
- Sensitive writes call `audit(db, tenantId, userId, action, payload)`.
- Actions observed in code (subset):
- `brand.create`, `brand.update`, `category.create`, `category.update`, `branding.update`
- Viewer UI to be added (see Roadmap).

### UI/UX
- Tailwind + shadcn/ui + Lucide icons.
- Tenant switcher + permission‑gated buttons/links.
- Toast notifications, spinners, pagination controls.
- Index page wrapper for consistent listing pages (planned).

---

## Architecture

### High Level
- **Next.js App Router** for both UI (server + client components) and API routes under `/app/api`.
- **Prisma** for schema, migrations, typed queries.
- **LocalStack S3** for uploads via presigned URLs (mirrors AWS behavior, local only).
- **RBAC**: global + tenant scopes, plus **custom roles** where enabled.
- **Branding**: per‑tenant values injected as CSS variables at runtime.

### Core Data Models
The Prisma schema includes (subset):
- **Core**: Tenant, User, Membership, Role, Permission, PermissionAssignment, Product, Category, Brand, Image, AuditLog, CustomRole
- **Other**: 

> All catalog entities (`Product`, `Category`, `Brand`, `Image`) are **scoped by `tenantId`**.

### Permission Helpers
- `can(permissionKey, tenantId?)`
- Server pages: `ensurePagePermission`, `ensureAnyPagePermission`
- API routes: `withTenantPermission`, `withAnyTenantPermission`, `withSystemRole`

**Patterns**
```ts
// Require a specific tenant permission
export const POST = withTenantPermission("brand.write", async (req, { db, tenantId, session }) => {
  // validate, check uniqueness within { tenantId }, write, audit(...)
  return ok({ /* ... */ });
});

// Allow if user has any of several permissions in the tenant
export const GET = withAnyTenantPermission(["category.read","category.write"], async (req, ctx) => { /*...*/ });

// System-admin only (outside tenant scope)
export const DELETE = withSystemRole(["ADMIN","SUPERADMIN"], async (req, { session }) => { /*...*/ });
```

### Validation & Errors
- Every endpoint parses and validates body/query with **Zod**.
- On failure: `400` with flattened Zod errors.
- Error shape example:
```json
{ "error": "Forbidden", "code": "FORBIDDEN", "details": {} }
```

---

## Setup

### 1) Install
```bash
npm install
```

### 2) Environment
Create `.env` (see `.env.example`):
```
DATABASE_URL=postgresql://USER:PASS@localhost:5432/dbname
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# LocalStack S3
S3_PUBLIC_BASE=http://s3.localhost.localstack.cloud:4566
S3_ENDPOINT=http://localhost:4566
S3_BUCKET_NAME=ecom-dev-bucket
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1

# Session timing (optional)
AUTH_SESSION_MAX_AGE_SECONDS=28800
AUTH_SESSION_UPDATE_AGE_SECONDS=300
```

### 3) Database
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 4) LocalStack (S3 emulator)
```bash
docker compose up -d
# Bucket URL pattern:
# http://s3.localhost.localstack.cloud:4566/<bucket-name>
```

### 5) Run Dev Server
```bash
npm run dev
```

### Default Admin
```
Email: admin@example.com
Password: Admin123!
```

---

## How Things Work

### Tenant Resolution
- Middleware inspects cookie `x-current-tenant-id`.
- If absent, server selects the first tenant membership.
- The value is provided to server pages and API guards.

### File Uploads
- Client requests a **presigned POST** from `/api/admin/uploads/presign`.
- Uploads go directly to LocalStack S3 (no file bytes through Next.js server).
- Stored under a tenant-aware path (e.g., `tenants/<tenantId>/brands/<id>.png`).
- Filenames sanitized and slugified.

### Admin Branding
- Per‑tenant configuration saved via `/api/admin/branding`.
- Theme tokens are converted to **CSS variables** (`--admin-*`) and applied at root.
- Sidebar/header use the uploaded tenant logo.

### Slugs & Uniqueness
- Input normalization: lowercase, `a‑z0‑9-` only.
- Per‑tenant uniqueness enforced at DB level.
- On update: exclude current record with `NOT: { id }` to avoid false conflicts.

### Auditing
- Writes call `audit(...)` with:
  - `tenantId`, `userId`, `action`, and a compact `payload`.
- View raw entries in DB (`AuditLog` model) while UI is pending.

---

## Typical Workflows

### Create a Brand
1. Go to **Admin → Brands** (must have `brand.write`).
2. Fill name + slug (auto‑generated), optional website, upload logo.
3. On save, server will:
   - Validate fields (Zod).
   - Enforce per‑tenant slug uniqueness.
   - Write record and emit `audit("brand.create", ...)`.

### Add a Product
1. **Products → New** (needs `product.write`).  
2. Select **Brand** and **Category** (tenant‑scoped options).  
3. Upload primary image → presigned S3 flow.  
4. Save → audit `product.create`.

### Invite a Member
1. **Members → Add** (needs `member.manage`).  
2. Choose an existing user or create one (system user must exist).  
3. Assign a role; OWNER/ADMIN may grant OWNER.  
4. Safeguards prevent removal of last OWNER.

---

## Directory Structure (trimmed)

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
|   |   +---20250909204415_custom_roles
|   |   |   \---migration.sql
|   |   +---20250909204658_new_custom_roles
|   |   |   \---migration.sql
|   |   +---20250909205450_more_custom_roles
|   |   |   \---migration.sql
|   |   +---20250910203801_add_tenant_branding
|   |   |   \---migration.sql
|   |   \---migration_lock.toml
|   +---schema.prisma
|   \---seed.ts
+---public
|   +---file.svg
|   +---globe.svg
|   +---login-hero.jpg
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
|   |   |   +---branding
|   |   |   |   \---page.tsx
|   |   |   +---brands
|   |   |   |   +---[id]
|   |   |   |   |   \---edit
|   |   |   |   |       \---page.tsx
|   |   |   |   +---new
|   |   |   |   |   \---page.tsx
|   |   |   |   \---page.tsx
|   |   |   +---categories
|   |   |   |   +---[id]
|   |   |   |   |   \---edit
|   |   |   |   |       \---page.tsx
|   |   |   |   +---new
|   |   |   |   |   \---page.tsx
|   |   |   |   \---page.tsx
|   |   |   +---members
|   |   |   |   +---new
|   |   |   |   |   \---page.tsx
|   |   |   |   \---page.tsx
|   |   |   +---products
|   |   |   |   +---[id]
|   |   |   |   |   \---edit
|   |   |   |   |       \---page.tsx
|   |   |   |   +---new
|   |   |   |   |   \---page.tsx
|   |   |   |   \---page.tsx
|   |   |   +---roles
|   |   |   |   +---[id]
|   |   |   |   |   \---edit
|   |   |   |   |       \---page.tsx
|   |   |   |   +---new
|   |   |   |   |   \---page.tsx
|   |   |   |   \---page.tsx
|   |   |   +---users
|   |   |   |   +---[id]
|   |   |   |   |   \---edit
|   |   |   |   |       \---page.tsx
|   |   |   |   +---new
|   |   |   |   |   \---page.tsx
|   |   |   |   \---page.tsx
|   |   |   +---layout.tsx
|   |   |   +---loading.tsx
|   |   |   \---page.tsx
|   |   +---api
|   |   |   +---admin
|   |   |   |   +---branding
|   |   |   |   |   \---route.ts
|   |   |   |   +---brands
|   |   |   |   |   +---[id]
|   |   |   |   |   |   \---route.ts
|   |   |   |   |   \---route.ts
|   |   |   |   +---categories
|   |   |   |   |   +---[id]
|   |   |   |   |   |   \---route.ts
|   |   |   |   |   \---route.ts
|   |   |   |   +---members
|   |   |   |   |   +---[id]
|   |   |   |   |   |   \---route.ts
|   |   |   |   |   \---route.ts
|   |   |   |   +---products
|   |   |   |   |   +---[id]
|   |   |   |   |   |   \---route.ts
|   |   |   |   |   \---route.ts
|   |   |   |   +---roles
|   |   |   |   |   +---[id]
|   |   |   |   |   |   \---route.ts
|   |   |   |   |   \---route.ts
|   |   |   |   +---tenant
|   |   |   |   |   \---switch
|   |   |   |   |       \---route.ts
|   |   |   |   +---uploads
|   |   |   |   |   \---presign
|   |   |   |   |       \---route.ts
|   |   |   |   \---users
|   |   |   |       +---[id]
|   |   |   |       |   \---route.ts
|   |   |   |       \---route.ts
|   |   |   \---auth
|   |   |       \---[...nextauth]
|   |   |           \---route.ts
|   |   +---login
|   |   |   \---page.tsx
|   |   +---favicon.ico
|   |   +---globals.css
|   |   +---layout.tsx
|   |   \---page.tsx
|   +---components
|   |   +---admin
|   |   |   +---index
|   |   |   |   +---admin-index-shell.tsx
|   |   |   |   +---data-pager.tsx
|   |   |   |   \---data-toolbar.tsx
|   |   |   +---admin-sidebar.tsx
|   |   |   +---admin-user-menu.tsx
|   |   |   +---brand-search.tsx
|   |   |   +---brand-select.tsx
|   |   |   +---brand-table.tsx
|   |   |   +---branding-theme-form.tsx
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
|   |   |   +---role-form.tsx
|   |   |   +---roles-table.tsx
|   |   |   +---tenant-cookie-guard.tsx
|   |   |   +---tenant-switcher.tsx
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
|   |       +---popover.tsx
|   |       +---select.tsx
|   |       +---spinner.tsx
|   |       +---switch.tsx
|   |       +---table.tsx
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
|   |   +---branding
|   |   |   +---css-vars.ts
|   |   |   +---defaults.ts
|   |   |   +---get-branding.ts
|   |   |   \---utils.ts
|   |   +---db
|   |   |   +---index.ts
|   |   |   +---prisma.ts
|   |   |   \---tenant-db.ts
|   |   +---http
|   |   |   \---apiFetch.ts
|   |   +---paging
|   |   |   +---index.ts
|   |   |   \---query.ts
|   |   +---storage
|   |   |   +---index.ts
|   |   |   \---s3.ts
|   |   +---tenant
|   |   |   +---bootstrap.ts
|   |   |   +---branding.ts
|   |   |   +---index.ts
|   |   |   \---resolve.ts
|   |   \---utils
|   |       +---env.ts
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
+---README-condensed.md
+---README.md
+---tsconfig.json
\---tsconfig.tsbuildinfo
```

> Tip: Use `node print-tree.mjs . "node_modules,.git,.next,dist" 10` to print your own local tree.

---

## Scripts & Utilities
```bash
npx prisma generate         # sync client after schema changes
npx prisma migrate reset    # drop + reapply + seed (local only)
npx prisma studio           # GUI to inspect/edit data

# Repair seeded roles/permissions if needed
node scripts/fix-roles.js

# Debug: copy file tree (ignore heavy dirs)
node print-tree.mjs . "node_modules,.git,.next,dist" 10
```

---

## Troubleshooting

### 1) Prisma client not generated
```
npx prisma generate
```

### 2) Reset DB completely
```
npx prisma migrate reset
```

### 3) LocalStack S3 “NoSuchBucket”
- Ensure the bucket exists inside LocalStack:
```
docker exec -it localstack bash
awslocal s3 mb s3://ecom-dev-bucket
```

### 4) LocalStack not responding
- Verify Docker is running.
- Start services: `docker compose up -d`.
- Check: `docker ps --filter "name=localstack"`.

### 5) NextAuth JWT decryption failed
- Confirm `NEXTAUTH_SECRET` is set.
- Restart dev server, clear cookies for `localhost:3000`.

### 6) “No tenant selected”
- Use Tenant Switcher to set `x-current-tenant-id`.
- Removing the cookie falls back to first membership.

### 7) Permission issues
- Confirm your user’s global role and tenant membership.
- Use **superadmin@example.com / Super123!** for full access.

### 8) Slug conflict on update
- Ensure server uses `NOT: { id }` in uniqueness checks.

---

## Security Notes (Why not Production?)
- No rate limiting or advanced WAF.
- No password reset / email verification flow.
- Minimal audit surfacing; logs stored but no UI yet.
- Assumes trusted developer environment.

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

#### Epic: Custom Roles & Permissions

**Scope:** Allow tenant OWNER/ADMIN users (and system-level Admin/Superadmin) to define custom roles with fine-grained permissions, beyond the default seeded roles (`OWNER`, `ADMIN`, `EDITOR`, `READONLY`).

**Features (RBAC: OWNER/ADMIN/system only)**  
- [x] Add `CustomRole` model linked to tenant.  
- [x] API routes for roles CRUD (list, create, update, delete).  
- [x] UI for listing roles with permissions and member counts.  
- [x] UI for creating/editing custom roles with name + description.  
- [x] Assign a set of permissions (checkboxes: `product.read`, `product.write`, `category.write`, etc).  
- [x] Custom roles appear alongside default roles in role selectors.  
- [x] Members can be assigned custom roles the same way as defaults.  
- [x] Safeguards:  
  - [x] Cannot remove all access (at least one permission required).  
  - [x] Last `OWNER` safeguard still applies.  
  - [x] System Admin/Superadmin can always override.  
- [x] Audit logs for role creation, update, and assignment.  
- [x] (Optional later) Role cloning — copy permissions from an existing role..  

#### Epic: Tenant Admin Branding

**Scope:** Controls the look & feel of the **admin panel only**. Storefront identity (logos, themes, CMS content) will be a **future epic**.

**Features (RBAC: OWNER/ADMIN only)**  
- [x] Tenant can upload an **admin logo** (shown in sidebar/header).  
- [x] Tenant can configure **admin theme colors** (accent, sidebar, background, etc).  
- [x] Branding settings stored per-tenant in the database.  
- [x] Changes apply instantly across the admin panel (via theme provider/context).  
- [x] Safeguards: only OWNER/ADMIN roles can update branding.  
- [x] Fallback to default theme if tenant branding not configured.  
- [x] Audit log entries for branding updates (who changed what, when).  

### 🚧 Planned Epics

### [P1] Epic: CSRF, CORS & Security Headers
**Scope:** Prevent cross-site attacks and tighten browser posture.  
**📍 Blast radius:** **Global** — middleware + **all mutating routes** and any client that performs POST/PUT/PATCH/DELETE.  
**🧭 Complexity (t-shirt):** **M** (straightforward, but touches many handlers)  
**🔀 Parallelizable:** High (headers/CSP in middleware; CSRF token plumbing in parallel across forms)  
**RBAC:** N/A (framework-level).

- [ ] Double-submit **CSRF** token for all mutations: `csrf` cookie + `x-csrf-token` header.
  - _Why:_ Cookie-backed sessions are CSRF-prone; token blocks cross-site form/posts.
  - _Replaces:_ No CSRF defense today (not production-safe).
- [ ] Strict **Origin/Referer** checks on `POST/PUT/PATCH/DELETE`.
  - _Why:_ Secondary guard if CSRF token leaks; rejects cross-origin mutations.
  - _Replaces:_ No origin validation today.
- [ ] Locked-down **CORS**: deny all except app origin; no credentials for public GET unless required.
  - _Why:_ Stops unauth origins from calling APIs with creds.
  - _Replaces:_ Implicit/loose CORS behavior.
- [ ] Global security headers via middleware: CSP (script/img/connect/frame), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`.
  - _Why:_ Mitigates XSS, clickjacking, data exfiltration; enforces allowed sources (e.g., S3/LocalStack).
  - _Replaces:_ Default headers (too permissive for prod).
- [ ] Unit/integration tests (expected rejections + good path).
  - _Why:_ Prevent regressions on future routes.
  - _Replaces:_ Ad-hoc manual validation.

**💰 Cost:** none.

---

### [P1] Epic: Tenant Isolation Enforcement
**Scope:** Defense-in-depth so no query escapes tenant scope.  
**📍 Blast radius:** **Global** — Prisma client extension, **most data access**; optional DB migrations for RLS.  
**🧭 Complexity (t-shirt):** **L** (⬆ to **XL** if adopting full DB RLS now)  
**🔀 Parallelizable:** Medium (Prisma `$extends` + tests first; RLS later behind a flag)  
**RBAC:** Existing.

- [ ] Prisma `$extends` that **auto-injects** `{ tenantId }` for scoped models; throw if missing.
  - _Why:_ Prevents “forgot to add tenantId” bugs.
  - _Replaces:_ Manual scoping (easy to miss in new code).
- [ ] Disallow unscoped reads/writes in shared models (unit tests to enforce).
  - _Why:_ Test gate catches regressions early.
  - _Replaces:_ Informal discipline only.
- [ ] (Optional Advanced) DB-level **RLS** policies; set `app.tenant` per request via Prisma raw.
  - _Why:_ DB hard barrier; even missed filters won’t leak.
  - _Replaces:_ App-only isolation (good, but not bulletproof).
- [ ] “Cross-tenant id” test suite (must return **404**, not 403).
  - _Why:_ Avoids existence leaks; codifies the pattern.
  - _Replaces:_ Ad-hoc checks.

**💰 Cost:** none.

---

### [P1] Epic: Observability & Error Handling
**Scope:** Understand what’s happening and fail gracefully.  
**📍 Blast radius:** **Global** — middleware, API error handling, shared logger; light UI changes for boundaries/toasts.  
**🧭 Complexity (t-shirt):** **M**  
**🔀 Parallelizable:** High (server logging/error envelope in parallel with UI boundaries)  
**RBAC:** N/A.

- [ ] Structured logger (`pino`) with redaction; include `requestId`, `userId`, `tenantId`, latency.
  - _Why:_ Queryable logs; avoid PII leakage.
  - _Replaces:_ `console.log`-style output.
- [ ] Request-ID middleware; propagate via headers & context.
  - _Why:_ Correlate client ↔ server ↔ audit entries.
  - _Replaces:_ No correlation id.
- [ ] Central error handler: map exceptions → consistent `error(code,message,details)`.
  - _Why:_ Stable contract to clients; easier debugging.
  - _Replaces:_ Mixed ad-hoc error responses.
- [ ] UI error boundaries + user-friendly toasts across forms/tables.
  - _Why:_ Avoid blank screens; improve recovery.
  - _Replaces:_ Occasional `alert()` or default boundaries.

**💰 Cost:** optional error tracking SaaS later; free tiers exist.

---

### [P1] Epic: Test Suite (Unit + Integration + E2E + Security)
**Scope:** Expand “Unit testing” into full coverage of critical paths.  
**📍 Blast radius:** **Global** — adds tests across modules; minimal production code churn.  
**🧭 Complexity (t-shirt):** **L** (breadth, not difficulty)  
**🔀 Parallelizable:** Very high (by module/suite)  
**RBAC:** N/A.

- [ ] **Unit:** validators, guards, slug rules, helpers (`ok/error`, perms).
  - _Why:_ Fast feedback on logic; prevents regressions.
  - _Replaces:_ Sparse/no unit tests.
- [ ] **Integration:** API routes against test Postgres (Testcontainers); tenant scope & transactions.
  - _Why:_ Validates server wiring & DB contracts.
  - _Replaces:_ Manual testing.
- [ ] **Security:** CSRF failures, rate limits, upload spoofing, over-long inputs.
  - _Why:_ Keeps defenses intact over time.
  - _Replaces:_ None.
- [ ] **E2E (Playwright):** sign-in, switch tenant, CRUD flows, branding update, image upload.
  - _Why:_ Prevents UI regressions in core flows.
  - _Replaces:_ Click-through testing.
- [ ] Coverage thresholds per folder; CI summary artifact.
  - _Why:_ Keeps quality from drifting.
  - _Replaces:_ No objective target.

**💰 Cost:** none.

---

### [P1] Epic: Idempotency & Transactional Integrity
**Scope:** Prevent duplicate writes and maintain invariants.  
**📍 Blast radius:** **Wide** — **most create endpoints**; adds a small table & transactions; moderate refactors in write paths.  
**🧭 Complexity (t-shirt):** **M/L** (depends on number of create flows)  
**🔀 Parallelizable:** Medium (idempotency + transactions can ship by module)  
**RBAC:** Existing.

- [ ] `Idempotency-Key` header for create endpoints; `IdempotencyKey` table (key, route, responseHash, TTL).
  - _Why:_ Network retries won’t duplicate records/charges.
  - _Replaces:_ Non-idempotent POST creates.
- [ ] Interactive transactions for multi-step invariants (e.g., last OWNER checks + update).
  - _Why:_ All-or-nothing correctness; avoids partial writes.
  - _Replaces:_ Sequential writes without txn.
- [ ] Optimistic concurrency: conditional updates on `updatedAt`/`version`.
  - _Why:_ Prevent lost updates on concurrent edits.
  - _Replaces:_ Blind updates.

**💰 Cost:** none.

---

### [P2] Epic: Session & Auth Hardening (repo-only) — **Supersedes “Activity timeouts”**
**Scope:** Strong sessions, verified accounts, optional 2FA, lockouts.  
**📍 Blast radius:** **Moderate** — auth routes, session config, some UI; can be phased.  
**🧭 Complexity (t-shirt):** **L** overall (Phase A **M**, Phase B **M**)  
**🔀 Parallelizable:** Medium (flows are cohesive)  
**RBAC:** Public (auth flows) + existing roles.

- **Phase A (no-cost, do now):**
  - [ ] Enforce strict cookie/session config (httpOnly, secure in prod, `sameSite`, short `maxAge`, rotation on sign-in).
    - _Why:_ Reduces theft/replay risk; enforces secure defaults.
    - _Replaces:_ Dev-grade defaults.
  - [ ] Password policy via Zod (min length, char classes, breach block via local list).
    - _Why:_ Stops trivial passwords now; HIBP hash check can be added later.
    - _Replaces:_ Weak/absent server-side policy.
  - [ ] Optional **TOTP 2FA** + backup codes (no SMS).
    - _Why:_ Big uplift vs credential stuffing; free.
    - _Replaces:_ Single-factor logins only.
  - [ ] Brute-force login **lockout** integrated with rate limit backoff.
    - _Why:_ Throttle attacks; UX explains lockouts.
    - _Replaces:_ Unlimited attempts.

- **Phase B (costed, later):**
  - [ ] Email verification flow: `/api/auth/verify-email` + hashed single-use tokens (TTL).
    - _Why:_ Prevents account takeovers; common requirement.
    - _Replaces:_ No verification.
  - [ ] Password reset flow: request/reset endpoints + hashed tokens; audit events.
    - _Why:_ Essential account recovery.
    - _Replaces:_ No reset flow.

**💰 Cost:** Phase A: none. Phase B: transactional email ~$15–$50/mo when you’re ready.

---

### [P2] Epic: Rate Limiting & Abuse Controls
**Scope:** Throttle sensitive endpoints to reduce brute-force & scraping.  
**📍 Blast radius:** **Wide** — middleware touchpoint + **auth and admin routes**; low refactor.  
**🧭 Complexity (t-shirt):** **M**  
**🔀 Parallelizable:** High (per-endpoint policies roll out incrementally)  
**RBAC:** N/A.

- [ ] Lightweight rate-limit lib (`src/lib/security/ratelimit.ts`) with pluggable store.
  - _Why:_ Centralizes throttling; dev in-memory, prod Redis later.
  - _Replaces:_ No systematic throttling.
- [ ] Limits for: login, reset, verify, sign-up (if added), `/api/admin/*` mutations.
  - _Why:_ Most abused paths; protects state & email reputation.
  - _Replaces:_ No endpoint-specific policies.
- [ ] Per-IP + per-account keys; exponential backoff; optional CAPTCHA gate on high failure rate.
  - _Why:_ Defends against distributed & targeted attacks.
  - _Replaces:_ None.

**💰 Cost:** none now (in-memory). Later Redis ~$0–$10/mo; CAPTCHA can be free.

---

### [P2] Epic: Developer Experience & Config Safety
**Scope:** Reduce mistakes and speed up contributions.  
**📍 Blast radius:** **Global** — env loader, hooks, lint/test pre-commit; minimal runtime changes.  
**🧭 Complexity (t-shirt):** **M**  
**🔀 Parallelizable:** High (each guard rail is independent)  
**RBAC:** N/A.

- [ ] Strict `.env` validation (Zod) — fail fast at boot; separate server vs client exposure.
  - _Why:_ Prevents misconfig in prod; safer secrets handling.
  - _Replaces:_ Loose env checks.
- [ ] Pre-commit hooks: ESLint, typecheck, test subset, secret-scan.
  - _Why:_ Catches issues before they land.
  - _Replaces:_ Post-commit fixups.
- [ ] `.env.example` drift checker script to ensure parity with `env.ts`.
  - _Why:_ Docs stay accurate; onboarding is smooth.
  - _Replaces:_ Manually maintained example.
- [ ] Harden seed/utility scripts (exit codes, clear logs).
  - _Why:_ Predictable tooling behavior for CI/local.
  - _Replaces:_ Best-effort scripting.

**💰 Cost:** none.

---

### [P3] Epic: Upload Pipeline Hardening
**Scope:** Make file uploads safe and consistent.  
**📍 Blast radius:** **Targeted** — upload endpoints/components + small libs (magic sniff, sharp).  
**🧭 Complexity (t-shirt):** **M**  
**🔀 Parallelizable:** Medium (server pipeline + UI validations)  
**RBAC:** Existing.

- [ ] **Magic-number** detection; reject MIME spoofing.
  - _Why:_ `Content-Type` can lie; blocks polyglot attacks.
  - _Replaces:_ Trusting client MIME.
- [ ] Size & dimension caps; normalize with `sharp` (strip EXIF, resize presets, recompress).
  - _Why:_ Prevents oversized payloads/metadata leaks.
  - _Replaces:_ Raw pass-through uploads.
- [ ] Block SVG or sanitize before allowing.
  - _Why:_ SVG can execute scripts; high XSS risk.
  - _Replaces:_ Unsanitized SVGs.
- [ ] Allow-list of extensions & MIME; tenant-scoped keys; never accept user-supplied paths.
  - _Why:_ Prevents path traversal & arbitrary file types.
  - _Replaces:_ Looser validation.
- [ ] Presigned URLs w/ minimal privileges & short TTL; audit (`upload.create`, `upload.delete`).
  - _Why:_ Limits exposure, improves traceability.
  - _Replaces:_ Generic presign without least-privilege/TTL.

**💰 Cost:** none.

---

### [P3] Epic: Audit Log Integrity & Viewer
**Scope:** Make audits tamper-evident and visible.  
**📍 Blast radius:** **Moderate** — audit writes across mutations + a new UI page.  
**🧭 Complexity (t-shirt):** **M**  
**🔀 Parallelizable:** Medium (DB change first, UI next)  
**RBAC:** Admin/Superadmin; Tenant OWNER/ADMIN as needed.

- [ ] Extend `AuditLog` with `prevHash`, `hash` (sha256 chain), `requestId`, `ip`, `userAgent`.
  - _Why:_ Tamper-evident chain; ties actions to requests and clients.
  - _Replaces:_ Plain rows w/out integrity linkage.
- [ ] Store **diffs** for updates (minimal JSON patch).
  - _Why:_ Faster forensics; see exactly what changed.
  - _Replaces:_ “Updated X” with no details.
- [ ] Build **Audit UI** (filter by tenant, actor, action, date) + export to CSV/JSON.
  - _Why:_ Practical visibility for operators.
  - _Replaces:_ DB-only inspection.
- [ ] Integrity checker script (verifies hash chain).
  - _Why:_ Detects tampering or accidental edits.
  - _Replaces:_ None.

**💰 Cost:** none.

---

### [P3] Epic: Performance & Scaling Hygiene
**Scope:** Keep queries fast as data grows.  
**📍 Blast radius:** **Targeted** — Prisma schema/migrations + select query call-sites; minimal UI impact.  
**🧭 Complexity (t-shirt):** **M**  
**🔀 Parallelizable:** High (per-model/index changes)  
**RBAC:** N/A.

- [ ] Add indexes: `(tenantId, slug)`, `(tenantId, createdAt)`, `(tenantId, name)` and FK lookups used by lists.
  - _Why:_ Removes table scans and slow lookups.
  - _Replaces:_ Minimal/implicit indexes only.
- [ ] Switch large lists to **cursor pagination** (stable sort key).
  - _Why:_ Better performance than offset at scale.
  - _Replaces:_ Offset pagination everywhere.
- [ ] Limit `COUNT(*)` usage; prefer `take + 1` with `hasMore`.
  - _Why:_ Avoids expensive counts on big tables.
  - _Replaces:_ Count-first pagination.

**💰 Cost:** none.

---

### [P4] Epic: API Contracts & Versioning
**Scope:** Make APIs explicit and changeable safely.  
**📍 Blast radius:** **Wide** — generate docs; minimal route renames if adopting `/api/v1/*`.  
**🧭 Complexity (t-shirt):** **M**  
**🔀 Parallelizable:** Medium (establish v1, then migrate modules)  
**RBAC:** N/A.

- [ ] Generate OpenAPI (or adopt tRPC for end-to-end typing).
  - _Why:_ Consumers know the contract; easier testing/docs.
  - _Replaces:_ Implicit route shapes.
- [ ] Establish `/api/v1/*` namespace; deprecation policy.
  - _Why:_ Enables breaking changes without breaking clients.
  - _Replaces:_ Ungrouped routes.
- [ ] Contract tests to prevent breaking changes.
  - _Why:_ CI guardrail against accidental API drift.
  - _Replaces:_ None.

**💰 Cost:** none.

---

### [P4] Epic: Privacy, PII & Data Lifecycle
**Scope:** Respect user data and prepare for compliance.  
**📍 Blast radius:** **Moderate** — schema changes for encryption/retention + selected handlers.  
**🧭 Complexity (t-shirt):** **L**  
**🔀 Parallelizable:** Medium (by data domain)  
**RBAC:** Admin/system.

- [ ] Map PII fields; stricter Zod schemas with length caps & formats.
  - _Why:_ Avoid storing unnecessary/unsafe values.
  - _Replaces:_ Generic string fields without caps.
- [ ] Optional field-level encryption for sensitive columns (Prisma middleware + AES-GCM).
  - _Why:_ Mitigates DB snapshot leaks/insider risk.
  - _Replaces:_ Plaintext sensitive data.
- [ ] Data retention config; purge expired artifacts/logs.
  - _Why:_ Reduce blast radius; meet policies.
  - _Replaces:_ Infinite retention.
- [ ] “Right to erasure” helpers (soft-delete + PII scrubbing).
  - _Why:_ Compliance readiness; user trust.
  - _Replaces:_ Hard delete or nothing.
- [ ] Download-my-data export (tenant-scoped JSON).
  - _Why:_ Transparency & compliance.
  - _Replaces:_ Manual DB pulls.

**💰 Cost:** none.

---

### [P4] Epic: Feature Flags & Kill Switches
**Scope:** Ship risky features safely.  
**📍 Blast radius:** **Targeted** — small registry + checks around new features.  
**🧭 Complexity (t-shirt):** **S/M**  
**🔀 Parallelizable:** High (wrap modules progressively)  
**RBAC:** Admin/system.

- [ ] Minimal flag registry + TypeScript types with per-tenant overrides.
  - _Why:_ Gradual rollouts; quick revert if needed.
  - _Replaces:_ Hardcoded booleans.
- [ ] Gate new modules (e.g., branches/locations, storefront CMS).
  - _Why:_ Isolate unstable features.
  - _Replaces:_ Always-on modules.
- [ ] Emergency kill switches for auth + uploads.
  - _Why:_ Cut off compromised paths quickly.
  - _Replaces:_ Code edits + redeploys.

**💰 Cost:** none (self-hosted flags).

---

### [P5] Epic: Accessibility & UX Hardening
**Scope:** Avoid support issues and meet basic standards.  
**📍 Blast radius:** **Moderate** — many form/table components; low back-end impact.  
**🧭 Complexity (t-shirt):** **M**  
**🔀 Parallelizable:** High (per-page/feature)  
**RBAC:** N/A.

- [ ] WCAG AA pass on forms (labels, aria, focus, keyboard traps).
  - _Why:_ Accessibility + better keyboard UX for everyone.
  - _Replaces:_ Inconsistent semantics.
- [ ] Consistent empty/error/loading states across tables & forms.
  - _Why:_ Predictable UI, lower churn.
  - _Replaces:_ Ad-hoc placeholders.
- [ ] Sticky save bar for long forms; dirty-form guard modal (continue/discard/save-and-leave).
  - _Why:_ Prevent data loss; faster editing.
  - _Replaces:_ Non-sticky actions, accidental navigations.
- [ ] Toasts everywhere; remove `alert()` usage entirely.
  - _Why:_ Non-blocking, consistent notifications.
  - _Replaces:_ Alerts (jarring, blocking).

**💰 Cost:** none.

---

## Definition of Done — “Production Ready” (Repo)
- [ ] All **P1** epics complete: CSRF/CORS/Headers, Tenant Isolation Enforcement, Observability & Error Handling, Test Suite, Idempotency & Transactions.  
  - _Why:_ Highest-leverage, **global** or near-global improvements with no ongoing cost.
- [ ] **P2** epics: Session/Auth (Phase A), Rate Limiting, DevX/Config Safety.  
  - _Why:_ Tightens auth posture and keeps quality high with minimal cost.
- [ ] **P3** epics: Upload Hardening, Audit Integrity & Viewer, Performance indexes & cursor pagination.  
  - _Why:_ Targeted security + scalability.
- [ ] **P4–P5** epics: API Contracts/Versioning, Privacy/PII, Feature Flags, Accessibility.  
  - _Why:_ Productization and compliance readiness.

> Notes: All items above are repo-only; ops/deploy/WAF/CDN/DB PITR are intentionally out of scope here. Ordering prioritizes **no-cost**, **global-impact early**, and **security importance**.


### Epic: Activity timeouts
- [ ] Introduce session tokens that expire after a given time. This will be controlled within the .env file so we can easily test it on different environments. 
- [ ] On session expiration, redirect to login screen 
- [ ] On any logout, redirect to the login screen
- [ ] Refactor the login screen to look much nicer. Split the page in two, loging form on the left, big image on the right


### Epic: Branches/Locations
- [ ] Decice on the best appraoch for this. Should it just default to every tenant starts off with 1 location and they can just build out from there? Or is it feature enabled per tenant that allows that specific tenant to spilt their stock up between different branches? Pros and cons
- [ ] Not only product stock is split across different locations, but everything will be, from what customers you have, what suppliers you have, your orders etc

### Audit log
- [ ] Easy way to see all server traffic/audit logs
- [ ] Activity history to track who's changed what and when

### Epic: Find better alternative colour picker
- [ ] Look into some pre built colour pickers

### Epic: Better dirty state management - Should be done along side the form changes
- [ ] Admin UI loads tenant branding automatically on login/tenant switch.  
- [ ] On tenant switch, all state should be reset
- [ ] Better dirty state management on forms. Disalble save buttons if forms arent dirty. Discard changes button if form is dirty 
- [ ] If user tries to leave the page when form is dirty, show confirmation modal with three options, continue without saving/cancel/Save and continue

### Epic: Introduce new branding theme and components into the form pages
- [ ] First we need to rethink how we are handling the new/edit pages for each scenario and if it is relevant to create a global wrapper for this and if so, create a good plan of implementing this.
- [ ] Create global form component wrapper for all forms on the admin panel to use
  - [ ] this global component wrapper needs to account for scenarios where the page will have 'tabs'. For example, products pages will likely have, down the line, a lot of different features we don't currently have, for example, a tab to manage product document management to manage different instructions, a tab to manage product images and meta data, etc
  - [ ] What about scenarios like categories, where we will eventually want to have subcategories (is it wise to add this first before working no this epic?). How should we be displaying these subcategories within the category page itself? 
- [ ] Implement this new global form component across all pages that would use it
  - [ ] New/Edit product
  - [ ] New/Edit Category
  - [ ] New/Edit Brand
  - [ ] New/Edit Member
  - [ ] New/Edit User
  - [ ] New/Edit Roles
- [ ] All forms use toast notifications instead of alerts.
- [ ] Sticky save bar on long forms.


### Epic: Branches/Locations
- [ ] Add `Branch` model linked to tenant.  
- [ ] Products can be branch-specific (optional).  
- [ ] Orders can select branch for fulfillment.  
- [ ] Customers can have preferred branch.  
- [ ] Feature flag per tenant/plan.  

### Epic: Storefront CMS & Branding

**Scope:** Allows tenant OWNER/ADMIN users to customize their public-facing storefront with branding and content.

**Features (RBAC: OWNER/ADMIN only)**  
- [ ] Upload **storefront logo** and **favicon**.  
- [ ] Configure **brand colors**, typography, and theme tokens for storefront.  
- [ ] Manage **homepage content** (hero, banners, featured products).  
- [ ] Manage **CMS pages** (About, Contact, FAQs, etc).  
- [ ] Assets stored under `tenants/<tenantId>/storefront/...` in S3.  
- [ ] Storefront dynamically applies tenant branding and content at runtime.  
- [ ] (Optional later) Custom domains or subdomains per tenant (`tenant.example.com`).  


### Epic: Media Library & image editting
- [ ] Index page for any images/videos uploaded to the platform
- [ ] Ability to edit the image (crop/rotate etc) on upload and when the user edits. Probably best in a side modal

#### Epic: Product Media & Details
- [ ] Admins can upload multiple images for a product, reorder them, and set alt text.
- [ ] Admins can delete a product image.
- [ ] Admins can set product status (Draft/Active/Archived) and schedule publish.
- [ ] Admins can add compare-at price and cost price.

### Epic: Product Data Modeling
- [ ] Admins can define product options (Size, Color) and generate variants.
- [ ] Admins can set variant-level stock and price.
- [ ] Admins can add product attributes/specs (key/value).

### Epic: Index pages 
- [x] Global index page wrapper created to be used on all index pages
- [x] Update products index page
- [x] Update categories index page
- [x] Update brands index page
- [x] Update members index page
- [x] Update users index page
- [x] Update roles index page
- [ ] Bulk actions row above the column for bulk selecting/deleting

### Epic: Introducing subcategories and tags
- [ ] Decide on best place to put these. Should they have their own dedicated admin panel, or should they be intergrated elsewhere for example, the subcategories could be intergrated into the edit category page itself? 
- [ ] Admins can create tags and attach them to products.
- [ ] Admins can create subcategories that will be attached to products.
- [ ] Admins can merge duplicate tags.

### Epic: Customers (B2B accounts)
- [ ] Admins can create customers with details (name, contact, billing info).  
- [ ] Customers can have traits/contracts (price overrides, credit terms, max order size).  
- [ ] Portal customers can log in, view pricing, place orders.  
- [ ] Admins can view orders per customer across branches.  

### Epic: Suppliers
- [ ] Admins can create suppliers (name, contact, product catalog).  
- [ ] Products linked to suppliers (cost-side relationship).  
- [ ] Supplier management (min order qty, lead times, cost price).  
- [ ] Purchase orders raised against suppliers.  
- [ ] Supplier reporting (spend, stock, performance).  


### Epic: Integrity & Safety
- [ ] Audit log of recent changes (who/what/when).
- [ ] Export tenant data (JSON/CSV).
- [ ] Rate-limit sensitive ops per tenant.
- [ ] Cannot delete categories with products unless reassigning.

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

## Glossary
- **Tenant**: a company/account inside the system (owns catalog + users via memberships).
- **Membership**: links a `User` to a `Tenant` with a role.
- **Role**: a set of permissions inside a tenant (`OWNER`, etc., or custom).
- **Permission**: fine‑grained capability (e.g., `product.write`).
- **System Role**: global role across all tenants (`SUPERADMIN`, `ADMIN`, `USER`).

---

## License
Learning/demo code. Use at your own risk. Replace or add your preferred license for public release.
