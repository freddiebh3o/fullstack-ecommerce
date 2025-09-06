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
prisma/
  schema.prisma
  seed.ts
src/
  app/
    403/
      page.tsx
    admin/
      layout.tsx
      page.tsx
      loading.tsx
      products/
        page.tsx          # list
        new/page.tsx      # create
        [id]/
          edit/page.tsx   # edit
      categories/
        page.tsx          # list
        new/page.tsx      # create
        [id]/
          edit/page.tsz   # edit
    api/
      auth/[...nextauth]/route.ts
      admin/
        products/
          route.ts        # POST create
          [id]/route.ts   # PATCH update, DELETE
        categories/
          route.ts        # POST create
          [id]/route.ts   # PATCH update, DELETE
    page.tsx
    layout.tsx
    globals.css
    favicon.ico
  components/
    admin/
      admin-sidebar.tsx
      admin-user-menu.tsx
      category-select.tsx
      category-table.tsx
      edit-category-form.tsx
      edit-product-form.tsx
      new-product-form.tsx
      product-table.tsx
    theme/
      admin-theme-provider.tsx
      theme-toggle.tsx
    ui/
      button.tsx
      card.tsx
      form.tsx
      global-loading.tsx
      input.tsx
      label.tsx
      select.tsx
      spinner.tsx
  lib/
    auth.ts
    db.ts
    slug.ts
    utils.ts
  styles/
    admin-theme.css
    nprogress.css
  middleware.ts
types
  next-auth.d.ts
.env
components.json
eslint.config.mjs
next-env.d.ts
next.config.ts
package-lock.json
package.json
postcss.config.mjs
README.MD
tsconfig.json
docker-compose.yml
```

### Tech Stack
- Framework: Next.js 15 (App Router, TypeScript)
- UI: Tailwind CSS + shadcn/ui
- Auth: NextAuth.js v4 (Credentials + JWT)
- Database: Prisma ORM + Postgres
- Storage: AWS S3 (emulated by LocalStack)
- Icons: Lucide-react

## User Stories (Backlog, grouped by Epic)

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



