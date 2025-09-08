# Fullstack E-commerce (Next.js + Prisma)

This is a learning-focused fullstack e-commerce application built with **Next.js 15**, **Prisma**, and **Postgres**, featuring an **admin panel** with authentication and product management.  
Media uploads are handled locally via **AWS S3 emulation** (LocalStack in Docker) to practice scalable file storage without any AWS billing risk.
We’ve recently integrated **multitenancy support with RBAC permissions** so that all CRUD operations are scoped to a tenant, and users can switch between tenants securely.  

⚠️ **Note:** This project is strictly for practice. There will never be real users or a production deployment.

---

## Features (so far)
- Authentication with **NextAuth (credentials)** and role-based access (Admin / Customer)
- Admin dashboard with sidebar/topbar layout
- Product management  
  - List all products (with delete, edit)  
  - Create new product (basic fields, image upload, category select)  
  - Edit existing product  
  - Delete product  
- Category management  
  - List, create, edit, delete  
- **Brand management**  
  - List, create, edit, delete  
  - Brand logos with image upload  
  - Search + pagination support (server + UI ready)  
- User management *(Admin/Superadmin only)*  
  - Visible only to global Admin/Superadmin roles (internal company/developer accounts)  
  - List users across tenants  
  - Edit roles, reset password, delete users (with safeguards)  
- File uploads via S3 (LocalStack) — e.g. product images
- Database powered by **Prisma ORM + Postgres**
- UI with **Tailwind CSS** + **shadcn/ui** components
- Loading states with NProgress + route-level feedback


---

## 💸 Hosting & Infrastructure Costs

This project is designed to be cloud-hosted with **Next.js (Vercel or similar), Supabase (Postgres), and S3-compatible storage**. Below is an estimate of ongoing monthly costs at different scales (excluding developer time).

### Frontend + API (Next.js)
- **Vercel Pro**: $20/user/month (covers SSR, API routes, custom domains, SSL).  
- Alternative: self-host (AWS EC2 / DigitalOcean Droplet) from $5–$20/month.  

👉 Typical budget: **$20–$50/month**.

### Database (Supabase / Postgres)
- Supabase Free: 500MB storage, 50k requests.  
- Supabase Pro: $25/month → 8GB storage, 8GB bandwidth.  
- Scales with storage and usage:  
  - 50GB DB → ~$100/month.  
  - 200GB DB → ~$400/month.  

👉 Typical budget: **$25–$100/month initially**, scaling as tenants grow.

### Storage (S3 or Supabase Storage)
- Stores product images, logos, documents.  
- AWS S3 pricing: $0.023/GB stored, $0.09/GB egress.  
- Example:  
  - 10k images @ 500KB → 5GB = $0.12/month.  
  - 100k images → 50GB = $1.15/month.  
- Bandwidth (downloads by customers) is the main cost driver.  

👉 Typical budget: **$5–$25/month** early on.

### Authentication & Emails
- NextAuth itself is free.  
- OAuth providers (Google, Microsoft, etc.): free.  
- Email delivery (Postmark, SendGrid, etc.): $15–$50/month depending on volume.  

👉 Typical budget: **$0–$30/month**.

###  Database Backups & Snapshots (Supabase)

#### Daily Backups (included)
- **Pro Plan**: 1 daily backup retained for 7 days.
- **Team Plan**: Retained for 14 days.
- **Enterprise Plan**: Retained up to 30 days.
- No extra cost—part of the base plan.  
  *(Source: Supabase docs)*

#### Point-in-Time Recovery (PITR) – Optional Add-on
- Restores to any point in time (second-level precision).
- **Replaces** daily backups while active.
- Billed hourly for the duration enabled:
  - **7-day retention**: ~$100/month  
  - **14-day retention**: ~$200/month  
  - **28-day retention**: ~$400/month  
  *(Example based on full activation for 744-hour month)*

#### Summary Table

| Backup Type                | Included Cost    | Coverage                   | Add-on Cost                        |
|----------------------------|------------------|----------------------------|------------------------------------|
| Daily Automated Backups    |                  | 7/14/30-day retention      | None (in plan)                     |
| PITR Add-on (enabled only) |                  | Second-level granularity   | $100–$400/month based on retention |

## 💰 Total Hosting Cost Overview (Medium–Large Usage)

This section summarizes the expected monthly costs of running this project in production with **Supabase (DB/Auth/Storage)** and **Vercel/Next.js (frontend)**.

### Core Services

| Service          | Plan / Tier            | Est. Monthly Cost | Notes |
|------------------|------------------------|-------------------|-------|
| **Supabase Database** | Pro Plan (8GB Postgres, 500K monthly edge function calls, 100GB storage) | $25–$50 | Base subscription |
| **Supabase Storage**  | Included in Pro (100GB) | Extra: $0.02/GB beyond quota | Product images, documents, tenant assets |
| **Supabase Auth**     | Included in Pro | First 50k MAUs free, then $0.0035/user | Multi-tenant logins |
| **Supabase Edge Functions** | Included in Pro | Extra usage billed per request | For custom API logic |
| **Vercel Hosting**    | Pro Team Plan | $20/user (devs) + bandwidth charges | Covers Next.js SSR/ISR builds, CDN, domains |

### Backup & Recovery

| Backup Type            | Retention | Cost             | Notes |
|------------------------|-----------|------------------|-------|
| **Daily Backups**      | 7 days    | Included         | Automatic, no charge |
| **PITR (optional)**    | 7–28 days | $100–$400/month  | Precise recovery; billed hourly while enabled |

### Estimated Totals

- **Base (no PITR):**  
  ~$50–$100/month  
  (Supabase Pro + Vercel Pro + light storage overages)

- **With PITR enabled:**  
  ~$150–$500/month  
  (depending on retention period and storage growth)

- **Growth scaling factors:**  
  - +$0.02/GB storage per tenant (images, docs, backups)  
  - +$0.0035/authenticated user beyond 50k monthly users  
  - +Vercel bandwidth (first TB free, then ~$40/TB)  

### Notes

- Costs scale with **number of tenants**, **data stored**, and **traffic**.  
- For **enterprise use**, expect higher storage + PITR to be mandatory → ~$500–$800/month.  
- For **startup/small biz**, base Pro tiers on Supabase + Vercel will suffice (<$100/month).  


## Getting Started

### 1. Install dependencies
```bash
npm install

```
### 2. Environment variables
Create a .env file in the project root:
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
Generate the Prisma client and set up the database

```
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 4. Run localStack (S3 emulator)
```
docker compose up -d
```

### 5. LocalStack S3 Setup
LocalStack emulates AWS services locally. We use it here to emulate S3 for file uploads

After starting LocalStack with docker:
```
docker compuse up -d
```
You'll need to create the development bucket once inside the container:
```
# Open a shell inside the LocalStack container
docker exec -it localstack bash

#create the bucket 
awslocal s3 mb s3://ecom-dev-bucket
```

That's it -- the bucket ecom-dev-bucket will now be available at:
```
http://s3.localhost.localstack.cloud:4566/ecom-dev-bucket
```

### 5. Run the Development server
```
npm run dev
```

Open http://localhost:3000

### 6. Admin login
- Email: admin@example.com
- Password: Admin123!
- Login at http://localhost:3000/login

### 7. Useful scripts
```bash
# Regenerate Prisma client
npx prisma generate

# Reset DB (drops all data, re-applies migrations, re-seeds)
npx prisma migrate reset

# Inspect/edit data in a UI
npx prisma studio
```

### Project Structure
```
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
|   |   |   +---PermissionGate.tsx
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
|   |   +---api-ctx.ts
|   |   +---api-response.ts
|   |   +---audit.ts
|   |   +---auth.ts
|   |   +---client-fetch.ts
|   |   +---db.ts
|   |   +---page-guard.ts
|   |   +---permissions.ts
|   |   +---route-guard.ts
|   |   +---s3.ts
|   |   +---server-tenant.ts
|   |   +---slug.ts
|   |   +---tenant-bootstrap.ts
|   |   +---tenant-db.ts
|   |   +---tenant.ts
|   |   \---utils.ts
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

### Tech Stack
- Framework: Next.js 15 (App Router, TypeScript)
- UI: Tailwind CSS + shadcn/ui
- Auth: NextAuth.js v4 (Credentials + JWT)
- Database: Prisma ORM + Postgres
- Storage: AWS S3 (emulated by LocalStack)
- Icons: Lucide-react

### Estimated Costings



## 🔑 Recap of Recent Integration

- **Multitenancy foundations**  
  - Added `Tenant`, `Membership`, `Role`, `Permission`, and `PermissionAssignment` models.  
  - All `Product`, `Category`, `Brand`, `Image` entities are now tenant-scoped.  
  - Global users (`User`) can belong to multiple tenants through `Membership`.  

- **Role-based access control (RBAC)**  
  - Each tenant has seeded roles: `OWNER`, `ADMIN`, `EDITOR`, `READONLY`.  
  - Roles map to fine-grained permissions (`product.read`, `product.write`, `brand.read`, `brand.write`, etc).  
  - Safeguards prevent deleting/demoting the last OWNER of a tenant.  

- **Superadmin / Admin distinction**  
  - Global `SUPERADMIN`: can see/switch into all tenants.  
  - Global `ADMIN`: can create tenants and manage memberships, but only sees tenants they belong to.  
  - Global `USER`: needs membership in a tenant to access its admin UI.  

- **Tenant switcher**  
  - Users can switch tenants via a dropdown (`tenant-switcher.tsx`).  
  - Switching sets a signed cookie `x-current-tenant-id`, which server routes use to scope queries.  

- **Scoped CRUD**  
  - All `/api/admin/*` routes now resolve tenant context through a helper (`getApiTenantCtx` / `getCurrentTenantId`).  
  - Create/read/update/delete operations are fully tenant-isolated.  
  - Slug uniqueness is enforced per-tenant, not globally.  

- **Categories & Brands tenant integration**  
  - Categories and Brands now fully respect tenant scoping and permissions.  
  - API routes guarded with `withTenantPermission` / `withAnyTenantPermission`.  
  - Server pages guarded with `ensurePagePermission` / `ensureAnyPagePermission`.  
  - Client-side actions gated via `PermissionGate` using `canWriteCategory` / `canWriteBrand`.  
  - Audit logs capture create/update/delete actions with `{ tenantId, userId }`.  

- **Seed data**  
  - Two tenants (`default`, `acme`) are created with roles, memberships, categories, brands, and products.  
  - Multiple demo users are seeded with different roles per tenant for testing.  

---

### 🚧 Still to Do (Tenant Integration)
- **Dashboard** → ensure metrics/data are scoped by current tenant.  
- **Products** → apply the same tenant + permission guards as Categories/Brands.  
- **Members** → tenant-specific CRUD with role assignment + safeguards.  
- **Users tab** → restricted to Admin/Superadmin only (global view across tenants). Normal tenant users will never see this option.  

---

## 🧪 Testing tenant intergration Checklist

### Tenant core
- [ ] Resolve tenant on login → default selected; cookie set.  
- [ ] Switch tenant (SUPERADMIN) → works across all tenants.  
- [ ] Switch tenant (non-member) → 403 until membership exists.  

### CRUD isolation
- [ ] Create product in tenant A → not visible in tenant B.  
- [ ] Update/delete product in A → does not affect B.  
- [ ] Same slug allowed across tenants; conflict within same tenant.  
- [ ] Category/brand resolution scoped per-tenant.  

### Members & roles
- [ ] Owners/Admins can manage all.  
- [ ] Editors limited to product read/write.  
- [ ] Readonly can only view products.  
- [ ] Last OWNER cannot be demoted/deleted.  

### Tenant creation
- [ ] POST `/api/admin/tenants` → creates tenant + roles + OWNER membership.  
- [ ] Duplicate slug → blocked.  

### Tenant switcher
- [ ] Dropdown shows only accessible tenants.  
- [ ] Switch persists across navigation + refresh.  

### API hardening
- [ ] All routes scoped to `{ tenantId }`.  
- [ ] Cross-tenant ID operations → 404.  
- [ ] Invalid body → 400 with Zod error.  

### Auth/session
- [ ] Switch tenant does not log out.  
- [ ] Removing cookie falls back to first membership or “No tenant selected”.  

### Check for files no longer used and remove them

---


## User Stories (Backlog, grouped by Epic)

### Epic: Tenant & Permissions Foundation
- [x] Add `Tenant`, `Membership`, `Role`, `Permission`, and `PermissionAssignment` models.  
- [x] Bootstrap roles per tenant (`OWNER`, `ADMIN`, `EDITOR`, `READONLY`).  
- [x] Implement `getCurrentTenantId` helper (session/cookie/membership fallback).  
- [x] Add tenant switcher UI + API.  
- [x] Scope all admin CRUD operations to `tenantId`.  
- [x] Ensure slug uniqueness per-tenant (`@@unique([tenantId, slug])`).  
- [x] Implement role-based permission checks (`can()` helper).  
- [x] Add safeguards against deleting/demoting last OWNER.  
- [x] Seed two tenants with example users, roles, and catalog. 

### Epic: Branches/Locations (optional per tenant)
- [ ] Add `Branch` model linked to tenant.  
- [ ] Branch feature flag per tenant/plan.  
- [ ] Products can be branch-specific (optional).  
- [ ] Orders can select branch for fulfillment.  
- [ ] Customers can have preferred branch.  
- [ ] If disabled, tenant behaves as single-branch.

#### Sub-Epic C: Roles & Permissions (RBAC) -> Think this is already done but check this.
- [ ] Seed permission catalog.
- [ ] Seed default roles (Owner, Admin, Editor, ReadOnly).
- [ ] Admin can create custom roles (toggle permissions).
- [ ] Admin can assign roles to members.
- [ ] Authorization middleware + `can(permission)` helper everywhere.
- [ ] Safeguards (last owner cannot be demoted, cannot delete self, etc.).

#### Sub-Epic B: Plans & Feature Flags (Probably not going to do this as every deal will be made over the phone)
- [ ] Seed plans (`free`, `pro`, `enterprise`) with features (brands, tags, cms, analytics).
- [ ] Tenant can have a plan + feature overrides.
- [ ] Admin UI hides modules for disabled features.
- [ ] API blocks disabled features (403).
- [ ] Tenant “Plan & Features” screen to view/pretend-upgrade.

#### Sub-Epic D: Tenant Branding & Storefront Identity
- [ ] Tenant can upload logo, set brand colors, override theme tokens.
- [ ] Admin header shows tenant logo; storefront applies same tokens.
- [ ] Assets stored under `tenants/<tenantId>/…` in S3.
- [ ] (Optional later) Subdomain/path routing per tenant.

#### Sub-Epic E: Integrity, Audit & Safety
- [ ] Audit log includes tenantId, userId, action, entity, before/after, timestamp.
- [ ] Export tenant data (JSON/CSV).
- [ ] Rate-limit sensitive ops per tenant.
- [ ] Ensure delete flows respect tenant ownership.

### Epic: Customers (B2B accounts)
- [ ] Admins can create customers with core details (name, contact, billing info).  
- [ ] Customers can have traits/contracts (price overrides, credit terms, max order size).  
- [ ] Customers flagged as portal-enabled vs offline-only.  
- [ ] Portal customers can log in, view pricing, place orders.  
- [ ] Customers segmented by tags/segments (wholesale, retail, etc).  
- [ ] Admins can view orders per customer across branches.  

### Epic: Suppliers
- [ ] Admins can create suppliers (name, contact, product catalog).  
- [ ] Products linked to suppliers (cost-side relationship).  
- [ ] Supplier management (min order qty, lead times, cost price).  
- [ ] Purchase orders raised against suppliers.  
- [ ] Supplier reporting (spend, stock, performance).  

### Epic: Catalog Structure
- [x] Admins can create brands (name, slug, logo, description, website).  
  - [x] Brands table with search + pagination  
  - [x] Brand create/edit forms with slug auto-gen + URL validation  
  - [x] Brand logo upload via drag-and-drop with preview  
  - [x] Toast notifications for success/error notifications relating to brands  
  - [x] Brand column in product list  
- [x] Admins can create categories (name, slug).  
  - [x] Categories table with search + pagination  
  - [x] Category create/edit forms with slug auto-gen  
  - [x] Category delete safeguards when in use  
- [ ] Admins can create tags and attach them to products.  
- [ ] Admins can nest categories into subcategories.  
- [ ] Admins can set category banner and blurb for storefront.  

### Epic: Product Media & Details
- [ ] Admins can upload multiple images for a product, reorder them, and set alt text.
- [ ] Admins can delete a product image.
- [ ] Admins can set product status (Draft/Active/Archived) and schedule publish.
- [ ] Admins can add compare-at price and cost price.

### Epic: Product Data Modeling
- [ ] Admins can define product options (Size, Color) and generate variants.
- [ ] Admins can set variant-level stock and price.
- [ ] Admins can add product attributes/specs (key/value).

### Epic: Product List UX
- [ ] Admins can search and filter the product list by text, category, brand, tag, status.
- [ ] Admins can paginate and sort the product list.
- [ ] Admins can bulk-select products and apply actions (publish/unpublish/delete).

### Epic: Categories UX
- [ ] Admins can view categories in a tree and reorder them.
- [ ] Admins can hide categories without deleting.
- [ ] Admins see product counts per category including subcategories.

### Epic: Brands & Tags UX
- [ ] Admins can search and paginate brands, see product counts.
- [ ] Admins can merge duplicate tags.

### Epic: Users & Roles
- [ ] Admins can invite users with temporary passwords.
- [ ] Admins can filter users by role and search by email.
- [ ] Safeguards: cannot delete self or demote last admin.

### Epic: Admin UX Polish
- [ ] All forms use toast notifications instead of alerts.
- [ ] Sticky save bar on long forms.
- [ ] Unsaved changes warning before navigation.

### Epic: Integrity & Safety
- [ ] Cannot delete categories with products unless reassigning.
- [ ] Audit log of recent changes (who/what/when).


### Notes
- Recommended Node version >= 20
- LocalStack ensures zero AWS costs while testing S3 features
- If NextAuth JWT fails to decrypt, ensure NEXTAUTH_SECRET is set and restart dev server
- if '@prisma/client did not initialize, run'
```bash
npx prisma generate
```
- If NextAuth JWT decryption fails, ensure NEXTAUTH_SECRET is set and restart the dev server; clear cookies.



