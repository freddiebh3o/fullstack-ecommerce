# Fullstack E-commerce (Next.js + Prisma)

This is a fullstack e-commerce application built with **Next.js 15**, **Prisma**, and **Postgres**, featuring an **admin panel** with authentication and product management.

## Features (so far)
- Authentication with **NextAuth (credentials)** and role-based access (Admin / User)  
- Admin dashboard with sidebar/topbar layout  
- Product management  
  - List all products  
  - Create new product  
  - Edit existing product  
  - Delete product  
- Categories seeded & linked to products  
- Database powered by **Prisma ORM + Postgres**  
- UI with **Tailwind CSS** + **shadcn/ui** components  
- Loading states with custom spinner + route-level loading  

## Getting Started

### 1. Install dependencies
```bash
npm install
```
### 2. Install dependencies
Create a .env file in the project root:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/dbname"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret"
```

### 3. Prisma setup
Generate the Prisma client and set up the database

```
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 4. Run the Development server
```
npm run dev
```

Open http://localhost:3000

### 5. Admin login
- Email: admin@example.com
- Password: Admin123!
- Login at http://localhost:3000/login

### 6. Useful scripts
```bash
# Regenerate Prisma client
npm run prisma:generate  # if added, or: npx prisma generate

# Reset DB (DANGER: drops all data, re-applies migrations, re-seeds)
npx prisma migrate reset

# Inspect/edit data in a UI
npx prisma studio
```

### Project Structure
```
src/
  app/
    (shop)/
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
    api/
      auth/[...nextauth]/route.ts
      admin/
        products/
          route.ts        # POST create
          [id]/route.ts   # PATCH update, DELETE
  components/
    admin/
      admin-sidebar.tsx
      admin-user-menu.tsx
      product-table.tsx
      edit-product-form.tsx
    ui/
      spinner.tsx
      form.tsx
      button.tsx
      input.tsx
      label.tsx
  lib/
    db.ts
    auth.ts
prisma/
  schema.prisma
  seed.ts
```

### Tech Stack
- Framework: Next.js 15 (App Router, TypeScript)
- UI: Tailwind CSS + shadcn/ui
- Auth: NextAuth.js v4 (Credentials + JWT)
- Database: Prisma ORM + Postgres
- Icons: Lucide-react

### Notes
- Recommended Node version >= 20
- if '@prisma/client did not initialize, run'
```bash
npx prisma generate
```
- If NextAuth JWT decryption fails, ensure NEXTAUTH_SECRET is set and restart the dev server; clear cookies.
