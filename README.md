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
- Global roles: `SUPERUSER`, `USER`.
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
- **Users (system)**: SUPERUSER, cannot delete self / last ADMIN.
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
export const DELETE = withSystemRole(["SUPERUSER"], async (req, { session }) => { /*...*/ });
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

## Security Features (Current)

This repo includes a practical, defense-in-depth baseline suitable for a learning/demo app. Below is a concise summary of what is **already implemented**. 

### TL;DR
- **CSP + nonces** to block inline script execution unless explicitly allowed.
- **CSRF protection** using a double-submit token (`csrf` cookie + `x-csrf-token` header).
- **Origin/Referer checks** on mutating requests.
- **Locked-down CORS** (app origin only in dev/prod, minimal allowances).
- **Global security headers** (clickjacking, MIME sniffing, permissions, referrer).
- **Admin auth guard** in middleware (session/expiry → login with reason).
- **Tenant isolation by convention** (every catalog query scoped by `tenantId` + 404 on cross-tenant IDs).
- **Audit logging** for sensitive writes.
- **Safe upload flow** (presigned URLs to S3-compatible storage; tenant-scoped keys; sanitized filenames).

---

### Browser-Side Protections

#### Content Security Policy (CSP) with Per-Request Nonces
- Middleware generates a **random nonce per request** and injects it into:
  - The **`Content-Security-Policy`** response header:  
    `script-src 'self' 'nonce-<value>' 'strict-dynamic' ...`
  - Any **inline tags we intentionally allow** (e.g., tenant branding `<style>`).
- **Effect:** Browsers will **only execute inline code** that carries the matching nonce. Any injected script without the nonce will be blocked.
- Images (`img-src`) and network (`connect-src`) are **allow-listed** (e.g., app origin, LocalStack S3).
- We keep **styles pragmatic**: inline style elements are allowed so framework-inserted styles don’t break, but we **still nonce our branding style** for defense-in-depth.
- Also set: `frame-ancestors 'self'` to prevent clickjacking via iframes.

#### Other Security Headers
- `X-Content-Type-Options: nosniff` — blocks MIME sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` — limits cross-site referrer leakage.
- `Permissions-Policy` — disables sensitive browser features by default.
- `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site` — harden isolation.

> Dev mode keeps minimal relaxations (e.g., for HMR) while production stays strict.

---

### Request-Side Protections

#### CSRF (Double-Submit Token)
- All **mutations** (POST/PUT/PATCH/DELETE) require a **CSRF token**:
  - A `csrf` cookie is set on the client.
  - Clients must send **`x-csrf-token`** header with the same value.
- Server validates the pair. If missing/invalid → **400/403**.

#### Origin/Referer Validation
- On mutating requests, the server validates **`Origin`/`Referer`** to match the **app origin**.
- Rejects cross-site posts even if a CSRF token somehow leaked.

#### CORS Posture
- Locked down by default to **the app’s own origin**.
- No cross-site credentialed requests permitted.
- Dev includes localhost allowances only.

---

### Authentication & RBAC Enforcement
- Middleware protects **`/admin/*`** — unauthenticated or expired sessions are redirected to `/login` with a helpful `reason` (e.g., `expired`, `unauthenticated`).
- Server pages and APIs use **permission guards** (`withTenantPermission`, `withAnyTenantPermission`, `withSystemRole`).
- Login and session handled with **NextAuth (JWT)**; short/rotating policies can be tuned with env.

---

### Tenant Isolation (By Convention, Today)
- All catalog entities include **`tenantId`**, and **every read/write in app code scopes by `tenantId`**.
- Cross-tenant record access returns **404 (Not Found)** to avoid existence leaks.
- Slugs are **unique per tenant** (DB unique constraint on `[tenantId, slug]`).

> A Prisma `$extends` and/or DB-level RLS are on the roadmap for stronger guarantees, but not required to benefit from the current pattern.

---

### Auditing
- Sensitive writes call `audit(tenantId, userId, action, payload)` and persist to the `AuditLog` model.
- Useful for forensics and operator visibility. (Viewer UI is planned; rows are visible today via DB/Prisma Studio.)

---

### Upload Safety (Current)
- Clients obtain a **presigned URL** and upload **directly** to S3-compatible storage (LocalStack) — server never handles file bytes.
- Keys are **tenant-scoped** (e.g., `tenants/<tenantId>/...`); filenames are **sanitized/slugified**.
- (Planned hardening: magic-number MIME sniffing, size/dimension caps, SVG sanitization.)

---

### Developer Notes
- **Adding inline scripts?** Avoid when possible. If necessary, add `nonce={nonce}` server-side and ensure middleware is injecting the nonce header.
- **Adding inline styles?** Allowed; for sensitive/critical styles use a nonce like the branding block.
- **Fetching from new hosts?** Add them to `ALLOWED_CONNECT_HOSTS`/`ALLOWED_IMG_HOSTS` and (if needed) Next.js `remotePatterns`.
- **Local dev vs prod:** CSP is slightly more permissive in dev (e.g., eval for HMR); production stays strict.

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
- [x] Role assignment limited: only OWNERS, SUPERUSER may grant `OWNER`.  

#### Epic: Users (System-level)
- [x] Restricted to global `SUPERUSER`.  
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

**Scope:** Allow tenant OWNER/ADMIN users (and system-level SUPERUSER) to define custom roles with fine-grained permissions, beyond the default seeded roles (`OWNER`, `ADMIN`, `EDITOR`, `READONLY`).

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
  - [x] System SUPERUSER can always override.  
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

### [P1 Fix all errors on build]

---

## ✅ Must-Have Epics (Blockers Before Any Real Users)

### 1 Tenant Isolation (App Layer)
**Goal:** No query escapes tenant scope at the app layer.

**What’s done and verified**
- **Strict mode enabled in dev** (`TENANT_ENFORCEMENT_MODE=strict`).
- **Global `db` guarded**: any tenant-scoped model call via the global client throws in strict mode.
- **Tenant-scoped client auto-injects `tenantId`** (cross-tenant reads blocked even by ID).
- **404 semantics upheld** (route patterns rely on tenant-scoped fetch; existence doesn’t leak).

**“Done means” satisfied**
- Tenant-scoped CRUD paths verified locally with strict mode on (scripts below).
- Code search + runtime guard ensure no unscoped reads/writes remain (WIP pages will throw until wired).

---

### 2 CSRF, CORS & Security Headers (Enforced)
**Goal:** Block cross-site mutations and lock network posture.
- [ ] In API guard wrappers, **require** Origin/Referer on `POST/PUT/PATCH/DELETE`.
- [ ] Use **double-submit CSRF**: set `csrf` cookie on GET; require `x-csrf-token` on mutations.
- [ ] CORS: **deny by default**; allow only your app origin(s); send credentials only when needed.
- [ ] CSP: allow only required hosts for `script/img/connect/frame`. Add S3/LocalStack origins explicitly.
- [ ] **HSTS** header (enable once served over HTTPS): `max-age=31536000; includeSubDomains; preload`.

**Done means:**
- Mutations fail with `403` without a valid Origin **and** CSRF token.
- No unexpected third-party hosts needed in CSP; images/uploads still work with allow-list.

---

### 3 Login Rate Limiting (Auth Throttling)
**Goal:** Throttle credential stuffing and brute force.
- [ ] Add in-memory (dev) or Redis store for rate limits (per IP + per email).
- [ ] Backoff after ~5 failed attempts / 10 minutes; friendly error for locked accounts.
- [ ] Log lockout events (include `requestId`, `userId/email`, IP).

**Done means:**
- Repeated bad logins are throttled; logs show lockouts; successful logins reset counters.

---

### 4 Session & Auth Hardening (Phase A)
**Goal:** Strong cookie/session defaults and sane password policy.
- [ ] Cookies: `httpOnly`, `secure` in prod, `sameSite` appropriate, short `maxAge`, rotate on sign-in.
- [ ] Password policy (server-side): minimum length, basic complexity, reject common/breached list (local list acceptable).
- [ ] Disable verbose auth errors (avoid user enumeration).

**Done means:**
- Cookie settings differ between dev/prod correctly; weak passwords rejected; login errors are generic.

---

### 5 Storage Posture: S3 Bucket Policy (No Public ACLs)
**Goal:** Centralized, least-privilege public access.
- [ ] **Remove** `ACL: public-read` from uploads; keep objects private by default.
- [ ] Add a **bucket policy** that allows `s3:GetObject` only for a public prefix (e.g., `tenant-*/public/*`).
- [ ] (Optional) Block Public ACLs on the bucket; presigned PUTs limited to tenant prefix and content-type/size caps.

**Done means:**
- Public objects are readable via bucket policy; objects default private; presign flow unchanged for clients.

---

### 6 Operational Safety (Limits & Errors)
**Goal:** Keep the surface area safe at small scale.
- [ ] Pagination caps (`take <= N`) on all list endpoints; stable sorting.
- [ ] JSON payload size limits on API routes.
- [ ] Consistent error envelope; no stack traces or internal details in responses.

**Done means:**
- Large queries don’t explode memory; errors are uniform; logs (not clients) contain stack traces.

---

### 7 Dependency & Config Hygiene
**Goal:** Avoid known-vuln deps and config drift.
- [ ] Enable Dependabot/Renovate for npm updates (weekly).
- [ ] CI step: `audit` fails on high/critical vulns (prod deps).
- [ ] Strict `.env` validation (Zod); `.env.example` kept in sync.

**Done means:**
- PRs auto-open for updates; CI blocks risky vulns; app boot fails fast on bad config.

---

## ✨ Nice-to-Have Epics (High Value, Not Blockers)

### A Row-Level Security (DB Seatbelt, Behind a Flag)
- [ ] `SET LOCAL app.tenant` per request/transaction.
- [ ] RLS policies on tenant tables; app role **without** `BYPASSRLS`.

### B Idempotency & Concurrency
- [ ] `Idempotency-Key` on create endpoints with response caching by key.
- [ ] Optimistic concurrency (version/updatedAt) for admin edits.
- [ ] Interactive transactions for multi-step invariants.

### C Upload Pipeline Hardening
- [ ] Magic-number MIME detection (reject spoofed content).
- [ ] Image normalization with `sharp` (strip EXIF; size caps).
- [ ] Block or sanitize SVG.

### D Observability & Error Handling
- [ ] Structured logging (`pino`) w/ redaction; include `requestId`, `tenantId`, latency.
- [ ] Request-ID middleware; surface in responses and audit logs.
- [ ] UI error boundaries + non-blocking toasts.

### E Audit Log Integrity & Viewer
- [ ] Hash-chained audit entries (prevHash/hash), include `requestId`, ip, ua.
- [ ] Audit viewer with filters and export.

### F Performance & Scaling Hygiene
- [ ] Indexes on common lookups: `(tenantId, slug)`, `(tenantId, createdAt)`, `(tenantId, name)`.
- [ ] Prefer cursor pagination on large lists; avoid `COUNT(*)` where possible.

### G API Contracts & Versioning
- [ ] OpenAPI generation or tRPC.
- [ ] Namespace `/api/v1/*`; deprecation policy.

### H Privacy & Data Lifecycle
- [ ] PII inventory; stricter zod lengths/formats.
- [ ] Optional field-level encryption (AES-GCM middleware).
- [ ] Retention & purge jobs; export/download-my-data.

### I Feature Flags & Kill Switches
- [ ] Minimal flag registry + types.
- [ ] Kill switches for auth/uploads.

### J Session & Auth Hardening (Phase B)
- [ ] Email verification; password reset with hashed single-use tokens (TTL).
- [ ] Optional TOTP 2FA + backup codes.

### K Test Suite (Unit + Security)
- [ ] Unit: validators, guards, helpers.
- [ ] Security tests: CSRF/Origin failures, rate limits, upload bounds.
- [ ] Coverage thresholds per folder.

---

## Order of Operations (When You’re Ready)
1. **Tenant Isolation (Strict in dev)** → fix offenders.
2. **CSRF/Origin enforcement** → CORS/CSP tune.
3. **Login rate limiting** → **Session & cookie hardening**.
4. **S3 bucket policy** → remove public ACLs.
5. **Operational limits & error envelope**.
6. **Deps/config hygiene** (enable bots + CI audit).
7. Then pick from Nice-to-Haves (RLS, observability, uploads, etc.).

---

## Definition of “Production Ready” (for this project)
- All **Must-Have** epics marked **done** above.
- Manual QA passes with strict tenant enforcement **enabled** locally.
- No high/critical `audit` findings on production dependencies.
- HTTPS hosting ready; **HSTS** enabled on live domains.

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
- **System Role**: global role across all tenants (`SUPERUSER`, `USER`).

---

## License
Learning/demo code. Use at your own risk. Replace or add your preferred license for public release.
