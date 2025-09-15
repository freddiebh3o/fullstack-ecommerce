// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { bootstrapTenant } from "../src/lib/tenant/bootstrap";
import { DEFAULT_THEME } from "../src/lib/branding/defaults";

const prisma = new PrismaClient();

/** Safe logical upsert by (tenantId, slug) for Category */
async function upsertCategoryByTenantSlug(
  tenantId: string,
  slug: string,
  data: { name: string }
) {
  const existing = await prisma.category.findFirst({ where: { tenantId, slug } });
  if (existing) {
    return prisma.category.update({ where: { id: existing.id }, data: { ...data, tenantId } });
  }
  return prisma.category.create({ data: { tenantId, slug, ...data } });
}

/** Safe logical upsert by (tenantId, slug) for Brand */
async function upsertBrandByTenantSlug(
  tenantId: string,
  slug: string,
  data: {
    name: string;
    description?: string | null;
    websiteUrl?: string | null;
    logoUrl?: string | null;
  }
) {
  const existing = await prisma.brand.findFirst({ where: { tenantId, slug } });
  if (existing) {
    return prisma.brand.update({ where: { id: existing.id }, data: { ...data, tenantId } });
  }
  return prisma.brand.create({ data: { tenantId, slug, ...data } });
}

/** Safe logical upsert by (tenantId, slug) for Product */
async function upsertProductByTenantSlug(
  tenantId: string,
  slug: string,
  data: {
    name: string;
    description?: string | null;
    priceCents: number;
    currency?: string;
    stock?: number;
    brandId?: string | null;
    categoryId?: string | null;
    images?: { create: { tenantId: string; url: string; alt?: string | null; sortOrder?: number }[] };
  }
) {
  const existing = await prisma.product.findFirst({ where: { tenantId, slug } });
  if (existing) {
    return prisma.product.update({ where: { id: existing.id }, data: { ...data, tenantId } });
  }
  return prisma.product.create({ data: { tenantId, slug, ...data } });
}

async function ensureBranding(tenantId: string) {
  await prisma.tenantBranding.upsert({
    where: { tenantId },
    update: {}, // keep whatever is there
    create: {
      tenantId,
      logoUrl: DEFAULT_THEME.logoUrl ?? null,
      theme: DEFAULT_THEME, // ← canonical, rich theme (with header/table tokens)
    },
  });
}

async function main() {
  // 1) Plans
  const pro = await prisma.plan.upsert({
    where: { key: "pro" },
    update: { name: "Pro" },
    create: { key: "pro", name: "Pro" },
  });

  // 2) Global permission catalog
  const upsertPerm = (key: string, name: string) =>
    prisma.permission.upsert({
      where: { key },
      update: { name },
      create: { key, name },
    });

  const [
    permProdRead,
    permProdWrite,
    permBrandWrite,
    permCategoryWrite,
    permMemberManage,
    permCategoryRead,
    permBrandRead,
    permMemberRead,
    permRoleManage,
    permBrandingRead,
    permBrandingWrite,
  ] = await Promise.all([
    upsertPerm("product.read",   "Read products"),
    upsertPerm("product.write",  "Create/update/delete products"),
    upsertPerm("brand.write",    "Create/update/delete brands"),
    upsertPerm("category.write", "Create/update/delete categories"),
    upsertPerm("member.manage",  "Manage tenant members"),
    upsertPerm("category.read",  "Read categories"),
    upsertPerm("brand.read",     "Read brands"),
    upsertPerm("member.read",    "Read members"),
    upsertPerm("role.manage",    "Create/update/delete roles and assign permissions"),
    upsertPerm("branding.read",  "Read admin branding"),
    upsertPerm("branding.write", "Update admin branding"),
  ]);

  console.log("perm map:", {
    permProdRead: "product.read",
    permProdWrite: "product.write",
    permBrandWrite: "brand.write",
    permCategoryWrite: "category.write",
    permMemberManage: "member.manage",
    permCategoryRead: "category.read",
    permBrandRead: "brand.read",
    permMemberRead: "member.read",
    permRoleManage: "role.manage",
    permBrandingRead: "branding.read",
    permBrandingWrite: "branding.write",
  });

  // 3) Tenants
  const [tenantA, tenantB] = await Promise.all([
    prisma.tenant.upsert({
      where: { slug: "default" },
      update: { planId: pro.id },
      create: { name: "Default", slug: "default", planId: pro.id },
    }),
    prisma.tenant.upsert({
      where: { slug: "acme" },
      update: { planId: pro.id },
      create: { name: "Acme Inc", slug: "acme", planId: pro.id },
    }),
  ]);

  // 4) System users (global)
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin", role: "SUPERUSER", passwordHash: await bcrypt.hash("Admin123!", 10) },
  });

  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: { email: "superadmin@example.com", name: "Super Admin", role: "SUPERUSER", passwordHash: await bcrypt.hash("SuperAdmin123!", 10) },
  });

  // Per-tenant demo users (system role "USER"; tenant role via Membership)
  const aOwner  = await prisma.user.upsert({
    where: { email: "owner+default@example.com" },
    update: {},
    create: { email: "owner+default@example.com", name: "Default Owner", role: "USER", passwordHash: await bcrypt.hash("Owner123!", 10) },
  });
  const aAdmin  = await prisma.user.upsert({
    where: { email: "admin+default@example.com" },
    update: {},
    create: { email: "admin+default@example.com", name: "Default Admin", role: "USER", passwordHash: await bcrypt.hash("Admin123!", 10) },
  });
  const aEditor = await prisma.user.upsert({
    where: { email: "editor+default@example.com" },
    update: {},
    create: { email: "editor+default@example.com", name: "Default Editor", role: "USER", passwordHash: await bcrypt.hash("Editor123!", 10) },
  });
  const aRO     = await prisma.user.upsert({
    where: { email: "ro+default@example.com" },
    update: {},
    create: { email: "ro+default@example.com", name: "Default ReadOnly", role: "USER", passwordHash: await bcrypt.hash("Readonly123!", 10) },
  });

  const bOwner  = await prisma.user.upsert({
    where: { email: "owner+acme@example.com" },
    update: {},
    create: { email: "owner+acme@example.com", name: "Acme Owner", role: "USER", passwordHash: await bcrypt.hash("Owner123!", 10) },
  });
  const bAdmin  = await prisma.user.upsert({
    where: { email: "admin+acme@example.com" },
    update: {},
    create: { email: "admin+acme@example.com", name: "Acme Admin", role: "USER", passwordHash: await bcrypt.hash("Admin123!", 10) },
  });
  const bEditor = await prisma.user.upsert({
    where: { email: "editor+acme@example.com" },
    update: {},
    create: { email: "editor+acme@example.com", name: "Acme Editor", role: "USER", passwordHash: await bcrypt.hash("Editor123!", 10) },
  });
  const bRO     = await prisma.user.upsert({
    where: { email: "ro+acme@example.com" },
    update: {},
    create: { email: "ro+acme@example.com", name: "Acme ReadOnly", role: "USER", passwordHash: await bcrypt.hash("Readonly123!", 10) },
  });

  // 5) Bootstrap tenants: ensure roles exist and indicated user is OWNER
  await bootstrapTenant(tenantA.id, admin.id);
  await bootstrapTenant(tenantA.id, superadmin.id);
  await bootstrapTenant(tenantA.id, aOwner.id);

  await bootstrapTenant(tenantB.id, admin.id);
  await bootstrapTenant(tenantB.id, superadmin.id);
  await bootstrapTenant(tenantB.id, bOwner.id);

  await ensureBranding(tenantA.id);
  await ensureBranding(tenantB.id);

  // 6) Assign tenant roles for the remaining per-tenant users
  async function getTenantRoles(tenantId: string) {
    const roles = await prisma.role.findMany({ where: { tenantId }, select: { id: true, key: true } });
    return {
      OWNER:    roles.find(r => r.key === "OWNER")!,
      ADMIN:    roles.find(r => r.key === "ADMIN")!,
      EDITOR:   roles.find(r => r.key === "EDITOR")!,
      READONLY: roles.find(r => r.key === "READONLY")!,
    };
  }
  const rolesA = await getTenantRoles(tenantA.id);
  const rolesB = await getTenantRoles(tenantB.id);

  // Helper to upsert a membership by (tenantId, userId)
  async function setMember(tenantId: string, userId: string, roleId: string) {
    await prisma.membership.upsert({
      where: { tenantId_userId: { tenantId, userId } }, // composite unique in your schema
      update: { roleId },
      create: { tenantId, userId, roleId },
    });
  }

  // Default tenant (admin/editor/ro)
  await setMember(tenantA.id, aAdmin.id,  rolesA.ADMIN.id);
  await setMember(tenantA.id, aEditor.id, rolesA.EDITOR.id);
  await setMember(tenantA.id, aRO.id,     rolesA.READONLY.id);

  // Acme tenant (admin/editor/ro)
  await setMember(tenantB.id, bAdmin.id,  rolesB.ADMIN.id);
  await setMember(tenantB.id, bEditor.id, rolesB.EDITOR.id);
  await setMember(tenantB.id, bRO.id,     rolesB.READONLY.id);

  // 7) Assign permissions per role (per tenant)
  async function assignPerms(tenantId: string) {
    const tRoles = await prisma.role.findMany({ where: { tenantId }, select: { id: true, key: true } });
    const tOwner  = tRoles.find(r => r.key === "OWNER");
    const tAdmin  = tRoles.find(r => r.key === "ADMIN");
    const tEditor = tRoles.find(r => r.key === "EDITOR");
    const tRO     = tRoles.find(r => r.key === "READONLY");

    const assign = async (roleId: string | undefined, permIds: string[]) => {
      if (!roleId) return;
      await prisma.permissionAssignment.deleteMany({ where: { roleId } });
      await prisma.permissionAssignment.createMany({
        data: permIds.map(pid => ({ roleId, permissionId: pid })),
        skipDuplicates: true,
      });
    };

    await assign(tOwner?.id, [
      permProdRead.id, permBrandRead.id, permCategoryRead.id, permMemberRead.id,
      permProdWrite.id, permBrandWrite.id, permCategoryWrite.id, permMemberManage.id,
      permRoleManage.id,
      permBrandingRead.id, permBrandingWrite.id,
    ]);
    await assign(tAdmin?.id, [
      permProdRead.id, permBrandRead.id, permCategoryRead.id, permMemberRead.id,
      permProdWrite.id, permBrandWrite.id, permCategoryWrite.id, permMemberManage.id,
      permRoleManage.id,
      permBrandingRead.id, permBrandingWrite.id,
    ]);

    await assign(tEditor?.id, [
      permProdRead.id, permBrandRead.id, permCategoryRead.id, permMemberRead.id,
      permProdWrite.id, permBrandWrite.id, permCategoryWrite.id,
      permBrandingRead.id,
    ]);

    await assign(tRO?.id, [
      permProdRead.id, permBrandRead.id, permCategoryRead.id, permMemberRead.id,
      permBrandingRead.id,
    ]);
  }

  await assignPerms(tenantA.id);
  await assignPerms(tenantB.id);

  // 8) Catalog per tenant — ensure AT LEAST 20 categories, brands, products
  const MIN_COUNT = 20;

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  async function ensureMinCategories(tenantId: string, min: number) {
    // Seed a themed starter set, then fill up to min with generics
    const starter = [
      { slug: "solar-panels", name: "Solar Panels" },
      { slug: "inverters", name: "Inverters" },
      { slug: "batteries", name: "Batteries" },
    ];
    for (const c of starter) {
      await upsertCategoryByTenantSlug(tenantId, c.slug, { name: c.name });
    }
    // ensure generics cat-01..cat-XX
    for (let i = 1; i <= min; i++) {
      const slug = `category-${pad2(i)}`;
      await upsertCategoryByTenantSlug(tenantId, slug, { name: `Category ${pad2(i)}` });
    }
  }

  async function ensureMinBrands(tenantId: string, min: number) {
    const starter = [
      { slug: "sunlite",   name: "SunLite",   description: "Premium solar components.", websiteUrl: "https://example.com/sunlite",   logoUrl: "https://picsum.photos/seed/sunlite/200/200" },
      { slug: "ecopower",  name: "EcoPower",  description: "Eco-friendly inverters.",   websiteUrl: "https://example.com/ecopower",  logoUrl: "https://picsum.photos/seed/ecopower/200/200" },
      { slug: "heliotech", name: "HelioTech", description: "Advanced storage solutions.", websiteUrl: "https://example.com/heliotech", logoUrl: "https://picsum.photos/seed/heliotech/200/200" },
    ];
    for (const b of starter) {
      await upsertBrandByTenantSlug(tenantId, b.slug, b);
    }
    for (let i = 1; i <= min; i++) {
      const slug = `brand-${pad2(i)}`;
      await upsertBrandByTenantSlug(tenantId, slug, {
        name: `Brand ${pad2(i)}`,
        description: `Demo brand ${pad2(i)} for testing.`,
        websiteUrl: `https://example.com/brand-${pad2(i)}`,
        logoUrl: `https://picsum.photos/seed/${tenantId}-brand-${pad2(i)}/200/200`,
      });
    }
  }

  async function ensureMinProducts(tenantId: string, min: number) {
    // Fetch IDs for assignment
    const categories = await prisma.category.findMany({ where: { tenantId } });
    const brands = await prisma.brand.findMany({ where: { tenantId } });

    if (categories.length === 0 || brands.length === 0) {
      throw new Error("Seed error: categories/brands must be created before products.");
    }

    // Add a few named starters
    const starter = [
      {
        slug: "sunlite-400w", name: "SunLite 400W Panel",
        desc: "High-efficiency 400W monocrystalline panel.", price: 14999
      },
      {
        slug: "sunlite-450w", name: "SunLite 450W Panel",
        desc: "High-efficiency 450W monocrystalline panel.", price: 17999
      },
      {
        slug: "ecopower-inverter-3kw", name: "EcoPower Inverter 3kW",
        desc: "Reliable 3kW inverter.", price: 22999
      },
      {
        slug: "heliotech-battery-10kwh", name: "HelioTech Battery 10kWh",
        desc: "High-capacity 10kWh battery.", price: 49999
      },
    ];

    // Map helpful lookups
    const catBySlug: Record<string, string> = {};
    for (const c of categories) catBySlug[c.slug] = c.id;

    const brandBySlug: Record<string, string> = {};
    for (const b of brands) brandBySlug[b.slug] = b.id;

    // Ensure starters
    const panelsCatId = catBySlug["solar-panels"] ?? categories[0].id;
    const invertersCatId = catBySlug["inverters"] ?? categories[1 % categories.length].id;
    const batteriesCatId = catBySlug["batteries"] ?? categories[2 % categories.length].id;

    const sunliteId = brandBySlug["sunlite"] ?? brands[0].id;
    const ecoId     = brandBySlug["ecopower"] ?? brands[1 % brands.length].id;
    const helioId   = brandBySlug["heliotech"] ?? brands[2 % brands.length].id;

    await upsertProductByTenantSlug(tenantId, starter[0].slug, {
      name: starter[0].name,
      description: starter[0].desc,
      priceCents: starter[0].price, currency: "GBP", stock: 25,
      brandId: sunliteId, categoryId: panelsCatId,
      images: { create: [{ tenantId, url: `https://picsum.photos/seed/${tenantId}-panel400/800/600`, alt: "Panel 400", sortOrder: 0 }] },
    });

    await upsertProductByTenantSlug(tenantId, starter[1].slug, {
      name: starter[1].name,
      description: starter[1].desc,
      priceCents: starter[1].price, currency: "GBP", stock: 25,
      brandId: sunliteId, categoryId: panelsCatId,
      images: { create: [{ tenantId, url: `https://picsum.photos/seed/${tenantId}-panel450/800/600`, alt: "Panel 450", sortOrder: 0 }] },
    });

    await upsertProductByTenantSlug(tenantId, starter[2].slug, {
      name: starter[2].name,
      description: starter[2].desc,
      priceCents: starter[2].price, currency: "GBP", stock: 25,
      brandId: ecoId, categoryId: invertersCatId,
      images: { create: [{ tenantId, url: `https://picsum.photos/seed/${tenantId}-invert3/800/600`, alt: "Inverter 3kW", sortOrder: 0 }] },
    });

    await upsertProductByTenantSlug(tenantId, starter[3].slug, {
      name: starter[3].name,
      description: starter[3].desc,
      priceCents: starter[3].price, currency: "GBP", stock: 25,
      brandId: helioId, categoryId: batteriesCatId,
      images: { create: [{ tenantId, url: `https://picsum.photos/seed/${tenantId}-bat10/800/600`, alt: "Battery 10kWh", sortOrder: 0 }] },
    });

    // Fill up to min with generics product-01..product-XX
    for (let i = 1; i <= min; i++) {
      const slug = `product-${pad2(i)}`;
      const cat = categories[i % categories.length];
      const brand = brands[i % brands.length];
      const price = 10000 + i * 123; // deterministic but varied
      const stock = 10 + (i % 30);
      await upsertProductByTenantSlug(tenantId, slug, {
        name: `Product ${pad2(i)}`,
        description: `Demo product ${pad2(i)} for pagination & listing tests.`,
        priceCents: price,
        currency: "GBP",
        stock,
        brandId: brand.id,
        categoryId: cat.id,
        images: {
          create: [
            {
              tenantId,
              url: `https://picsum.photos/seed/${tenantId}-${slug}/800/600`,
              alt: `Image for ${slug}`,
              sortOrder: 0,
            },
          ],
        },
      });
    }
  }

  // Ensure counts for both tenants
  for (const t of [tenantA, tenantB]) {
    await ensureMinCategories(t.id, MIN_COUNT);
    await ensureMinBrands(t.id, MIN_COUNT);
    await ensureMinProducts(t.id, MIN_COUNT);
  }

  // 9) Ensure AT LEAST 20 members per tenant (create additional demo users)
  async function ensureMinMembersPerTenant(tenantSlug: string, tenantId: string, minMembers: number) {
    const roles = await getTenantRoles(tenantId);
    const currentCount = await prisma.membership.count({ where: { tenantId } });

    // We will add 20 deterministic members regardless of current count,
    // which guarantees >= 20 memberships per tenant.
    const needed = Math.max(0, minMembers - currentCount);
    const toCreate = Math.max(needed, minMembers); // create a block of 20 deterministic ones

    // To keep it simple/deterministic: always seed member01..member20 for each tenant.
    for (let i = 1; i <= minMembers; i++) {
      const tag = `${tenantSlug}-${pad2(i)}`;
      const email = `member${pad2(i)}+${tenantSlug}@example.com`;
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: `Member ${pad2(i)} (${tenantSlug})`,
          role: "USER",
          passwordHash: await bcrypt.hash("Member123!", 10),
        },
      });

      // Rotate roles for variety
      const roleId =
        i % 6 === 0 ? roles.OWNER.id :
        i % 3 === 0 ? roles.ADMIN.id :
        i % 2 === 0 ? roles.EDITOR.id :
        roles.READONLY.id;

      await setMember(tenantId, user.id, roleId);
    }
  }

  await ensureMinMembersPerTenant(tenantA.slug, tenantA.id, MIN_COUNT);
  await ensureMinMembersPerTenant(tenantB.slug, tenantB.id, MIN_COUNT);

  console.log("Seeded OK:", {
    tenants: [tenantA.slug, tenantB.slug],
    users: [
      "admin@example.com", "superadmin@example.com",
      "owner+default@example.com", "admin+default@example.com", "editor+default@example.com", "ro+default@example.com",
      "owner+acme@example.com", "admin+acme@example.com", "editor+acme@example.com", "ro+acme@example.com",
      // plus memberXX+tenant@example.com created above
    ],
  });

  // Debug: print users with their memberships/roles/permissions
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          tenant: { select: { slug: true } },
          role: {
            select: {
              key: true,
              name: true,
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
        },
      },
    },
  });

  console.log("=== Users & Roles after seed ===");
  for (const u of users) {
    console.log(`User: ${u.email} (${u.name ?? "no name"}) [system role=${u.role}]`);
    for (const m of u.memberships) {
      console.log(
        `  Tenant=${m.tenant.slug} → ${m.role.key} (${m.role.name}) perms=[${m.role.permissions
          .map(p => p.permission.key)
          .join(", ")}]`
      );
    }
  }
  console.log("================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
