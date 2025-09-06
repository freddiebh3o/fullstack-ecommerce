# Fullstack E-commerce (Next.js + Prisma)

This is a learning-focused fullstack e-commerce application built with **Next.js 15**, **Prisma**, and **Postgres**, featuring an **admin panel** with authentication and product management.  
Media uploads are handled locally via **AWS S3 emulation** (LocalStack in Docker) to practice scalable file storage without any AWS billing risk.

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
- User management  
  - List users (admin/customer)  
  - Edit roles, reset password, delete users (with safeguards)
- File uploads via S3 (LocalStack) — e.g. product images
- Database powered by **Prisma ORM + Postgres**
- UI with **Tailwind CSS** + **shadcn/ui** components
- Loading states with NProgress + route-level feedback

---

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
+---prisma
|   +---migrations
|   |   +---20250902222844_init
|   |   |   \---migration.sql
|   |   +---20250902224148_add_user_model
|   |   |   \---migration.sql
|   |   +---20250903124712_categories_crud
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
+---src
|   +---app
|   |   +---403
|   |   |   \---page.tsx
|   |   +---admin
|   |   |   +---brands
|   |   |   |   +---[id]
|   |   |   |   +---new
|   |   |   |   \---page.tsx
|   |   |   +---categories
|   |   |   |   +---[id]
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
|   |   |   |   +---products
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
|   |   |   +---new-product-form.tsx
|   |   |   +---new-user-form.tsx
|   |   |   +---product-table.tsx
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
|   |   +---auth.ts
|   |   +---db.ts
|   |   +---s3.ts
|   |   +---slug.ts
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

## User Stories (Backlog, grouped by Epic)

### Epic: Multi-Tenancy & Permissions (FOUNDATION)
#### Sub-Epic A: Tenant Fundamentals
- [ ] Admin can create a tenant (name, slug).
- [ ] Admin can switch tenants in the admin header.
- [ ] Admin can invite a user to a tenant (email invite with temporary password).
- [ ] Admin can manage tenant members (list, change role, remove).
- [ ] All admin/API queries are scoped by tenant.

#### Sub-Epic B: Plans & Feature Flags
- [ ] Seed plans (`free`, `pro`, `enterprise`) with features (brands, tags, cms, analytics).
- [ ] Tenant can have a plan + feature overrides.
- [ ] Admin UI hides modules for disabled features.
- [ ] API blocks disabled features (403).
- [ ] Tenant “Plan & Features” screen to view/pretend-upgrade.

#### Sub-Epic C: Roles & Permissions (RBAC)
- [ ] Seed permission catalog.
- [ ] Seed default roles (Owner, Admin, Editor, ReadOnly).
- [ ] Admin can create custom roles (toggle permissions).
- [ ] Admin can assign roles to members.
- [ ] Authorization middleware + `can(permission)` helper everywhere.
- [ ] Safeguards (last owner cannot be demoted, cannot delete self, etc.).

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

### Epic: Catalog Structure
- [x] Admins can create brands (name, slug, logo, description, website).
  - [x] Brands table with search + pagination
  - [x] Brand create/edit forms with slug auto-gen + URL validation
  - [x] Logo upload via drag-and-drop with preview
  - [x] Toast notifications for success/error
  - [x] Brand column in product list
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



