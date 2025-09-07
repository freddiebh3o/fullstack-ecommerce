// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { bootstrapTenant } from "../src/lib/tenant-bootstrap";

const prisma = new PrismaClient();

/** Safe “logical upsert” by (tenantId, slug) regardless of compound unique selector name. */
async function upsertCategoryByTenantSlug(tenantId: string, slug: string, data: { name: string }) {
  const existing = await prisma.category.findFirst({ where: { tenantId, slug } });
  if (existing) {
    return prisma.category.update({ where: { id: existing.id }, data: { ...data, tenantId } });
  }
  return prisma.category.create({ data: { tenantId, slug, ...data } });
}

async function upsertBrandByTenantSlug(
  tenantId: string,
  slug: string,
  data: { name: string; description?: string | null; websiteUrl?: string | null; logoUrl?: string | null }
) {
  const existing = await prisma.brand.findFirst({ where: { tenantId, slug } });
  if (existing) {
    return prisma.brand.update({ where: { id: existing.id }, data: { ...data, tenantId } });
  }
  return prisma.brand.create({ data: { tenantId, slug, ...data } });
}

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
    return prisma.product.update({
      where: { id: existing.id },
      data: { ...data, tenantId },
    });
  }
  return prisma.product.create({
    data: { tenantId, slug, ...data },
  });
}

async function main() {
  // 1) Plan
  const pro = await prisma.plan.upsert({
    where: { key: "pro" },
    update: { name: "Pro" },
    create: { key: "pro", name: "Pro" },
  });

  // 2) Permission catalog
  const [
    permProdRead,        // product.read
    permProdWrite,       // product.write
    permBrandWrite,      // brand.write
    permCategoryWrite,   // category.write
    permMemberManage     // member.manage
  ] = await Promise.all([
    prisma.permission.upsert({
      where: { key: "product.read" },
      update: { name: "Read products" },
      create: { key: "product.read", name: "Read products" },
    }),
    prisma.permission.upsert({
      where: { key: "product.write" },
      update: { name: "Create/update/delete products" },
      create: { key: "product.write", name: "Create/update/delete products" },
    }),
    prisma.permission.upsert({
      where: { key: "brand.write" },
      update: { name: "Create/update/delete brands" },
      create: { key: "brand.write", name: "Create/update/delete brands" },
    }),
    prisma.permission.upsert({
      where: { key: "category.write" },
      update: { name: "Create/update/delete categories" },
      create: { key: "category.write", name: "Create/update/delete categories" },
    }),
    prisma.permission.upsert({
      where: { key: "member.manage" },
      update: { name: "Manage tenant members" },
      create: { key: "member.manage", name: "Manage tenant members" },
    }),
  ]);

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
    create: {
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("Admin123!", 10),
    },
  });

  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      email: "superadmin@example.com",
      name: "Super Admin",
      role: "SUPERADMIN",
      passwordHash: await bcrypt.hash("SuperAdmin123!", 10),
    },
  });

  // Per-tenant demo users
  const aOwner = await prisma.user.upsert({
    where: { email: "owner+default@example.com" },
    update: {},
    create: {
      email: "owner+default@example.com",
      name: "Default Owner",
      role: "USER",
      passwordHash: await bcrypt.hash("Owner123!", 10),
    },
  });
  const aAdmin = await prisma.user.upsert({
    where: { email: "admin+default@example.com" },
    update: {},
    create: {
      email: "admin+default@example.com",
      name: "Default Admin",
      role: "USER",
      passwordHash: await bcrypt.hash("Admin123!", 10),
    },
  });
  const aEditor = await prisma.user.upsert({
    where: { email: "editor+default@example.com" },
    update: {},
    create: {
      email: "editor+default@example.com",
      name: "Default Editor",
      role: "USER",
      passwordHash: await bcrypt.hash("Editor123!", 10),
    },
  });
  const aRO = await prisma.user.upsert({
    where: { email: "ro+default@example.com" },
    update: {},
    create: {
      email: "ro+default@example.com",
      name: "Default ReadOnly",
      role: "USER",
      passwordHash: await bcrypt.hash("Readonly123!", 10),
    },
  });

  const bOwner = await prisma.user.upsert({
    where: { email: "owner+acme@example.com" },
    update: {},
    create: {
      email: "owner+acme@example.com",
      name: "Acme Owner",
      role: "USER",
      passwordHash: await bcrypt.hash("Owner123!", 10),
    },
  });
  const bAdmin = await prisma.user.upsert({
    where: { email: "admin+acme@example.com" },
    update: {},
    create: {
      email: "admin+acme@example.com",
      name: "Acme Admin",
      role: "USER",
      passwordHash: await bcrypt.hash("Admin123!", 10),
    },
  });
  const bEditor = await prisma.user.upsert({
    where: { email: "editor+acme@example.com" },
    update: {},
    create: {
      email: "editor+acme@example.com",
      name: "Acme Editor",
      role: "USER",
      passwordHash: await bcrypt.hash("Editor123!", 10),
    },
  });
  const bRO = await prisma.user.upsert({
    where: { email: "ro+acme@example.com" },
    update: {},
    create: {
      email: "ro+acme@example.com",
      name: "Acme ReadOnly",
      role: "USER",
      passwordHash: await bcrypt.hash("Readonly123!", 10),
    },
  });

  // 5) Bootstrap tenants → create roles & make specified user OWNER
  await bootstrapTenant(tenantA.id, admin.id);
  await bootstrapTenant(tenantA.id, superadmin.id);
  await bootstrapTenant(tenantA.id, aOwner.id);

  await bootstrapTenant(tenantB.id, admin.id);
  await bootstrapTenant(tenantB.id, superadmin.id);
  await bootstrapTenant(tenantB.id, bOwner.id);

  // 6) Assign tenant roles for the rest of the per-tenant users
  async function getTenantRoles(tenantId: string) {
    const roles = await prisma.role.findMany({
      where: { tenantId },
      select: { id: true, key: true },
    });
    return {
      OWNER: roles.find(r => r.key === "OWNER")!,
      ADMIN: roles.find(r => r.key === "ADMIN")!,
      EDITOR: roles.find(r => r.key === "EDITOR")!,
      READONLY: roles.find(r => r.key === "READONLY")!,
    };
  }

  const rolesA = await getTenantRoles(tenantA.id);
  const rolesB = await getTenantRoles(tenantB.id);

  // helper to upsert a membership
  async function setMember(tenantId: string, userId: string, roleId: string) {
    await prisma.membership.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      update: { roleId },
      create: { tenantId, userId, roleId },
    });
  }

  // Default tenant memberships
  await setMember(tenantA.id, aAdmin.id, rolesA.ADMIN.id);
  await setMember(tenantA.id, aEditor.id, rolesA.EDITOR.id);
  await setMember(tenantA.id, aRO.id, rolesA.READONLY.id);

  // Acme tenant memberships
  await setMember(tenantB.id, bAdmin.id, rolesB.ADMIN.id);
  await setMember(tenantB.id, bEditor.id, rolesB.EDITOR.id);
  await setMember(tenantB.id, bRO.id, rolesB.READONLY.id);

  // 7) Assign permissions per tenant role
  async function assignPerms(tenantId: string) {
    const tRoles = await prisma.role.findMany({
      where: { tenantId },
      select: { id: true, key: true },
    });
    const tOwner = tRoles.find(r => r.key === "OWNER");
    const tAdmin = tRoles.find(r => r.key === "ADMIN");
    const tEditor = tRoles.find(r => r.key === "EDITOR");
    const tRO = tRoles.find(r => r.key === "READONLY");

    const assign = async (roleId: string | undefined, permIds: string[]) => {
      if (!roleId) return;
      await prisma.permissionAssignment.deleteMany({ where: { roleId } });
      await prisma.permissionAssignment.createMany({
        data: permIds.map(pid => ({ roleId, permissionId: pid })),
        skipDuplicates: true,
      });
    };

    await assign(tOwner?.id, [permProdRead.id, permProdWrite.id, permBrandWrite.id, permCategoryWrite.id, permMemberManage.id]);
    await assign(tAdmin?.id, [permProdRead.id, permProdWrite.id, permBrandWrite.id, permCategoryWrite.id, permMemberManage.id]);
    await assign(tEditor?.id, [permProdRead.id, permProdWrite.id]);
    await assign(tRO?.id, [permProdRead.id]);
  }

  await assignPerms(tenantA.id);
  await assignPerms(tenantB.id);

  // 8) Catalog data per tenant (safe logical upserts)
  async function seedCatalog(tenantId: string) {
    // Categories
    const cPanels = await upsertCategoryByTenantSlug(tenantId, "solar-panels", { name: "Solar Panels" });
    const cInverters = await upsertCategoryByTenantSlug(tenantId, "inverters", { name: "Inverters" });
    const cBatteries = await upsertCategoryByTenantSlug(tenantId, "batteries", { name: "Batteries" });

    // Brands
    const bSunlite = await upsertBrandByTenantSlug(tenantId, "sunlite", {
      name: "SunLite",
      description: "Premium solar components.",
      websiteUrl: "https://www.sunlite.com",
      logoUrl: "https://picsum.photos/seed/sunlite/200/200",
    });
    const bEco = await upsertBrandByTenantSlug(tenantId, "ecopower", {
      name: "EcoPower",
      description: "Eco-friendly inverters and components.",
      websiteUrl: "https://www.ecopower.example",
      logoUrl: "https://picsum.photos/seed/ecopower/200/200",
    });
    const bHelio = await upsertBrandByTenantSlug(tenantId, "heliotech", {
      name: "HelioTech",
      description: "Advanced storage solutions.",
      websiteUrl: "https://www.heliotech.example",
      logoUrl: "https://picsum.photos/seed/heliotech/200/200",
    });

    // Products
    await upsertProductByTenantSlug(tenantId, "sunlite-400w", {
      name: "SunLite 400W Panel",
      description: "High-efficiency 400W monocrystalline panel.",
      priceCents: 14999,
      currency: "GBP",
      stock: 25,
      brandId: bSunlite.id,
      categoryId: cPanels.id,
      images: { create: [{ tenantId, url: "https://picsum.photos/seed/panel400/800/600", alt: "Panel 400", sortOrder: 0 }] },
    });

    await upsertProductByTenantSlug(tenantId, "sunlite-450w", {
      name: "SunLite 450W Panel",
      description: "High-efficiency 450W monocrystalline panel.",
      priceCents: 17999,
      currency: "GBP",
      stock: 25,
      brandId: bSunlite.id,
      categoryId: cPanels.id,
      images: { create: [{ tenantId, url: "https://picsum.photos/seed/panel450/800/600", alt: "Panel 450", sortOrder: 0 }] },
    });

    await upsertProductByTenantSlug(tenantId, "ecopower-inverter-3kw", {
      name: "EcoPower Inverter 3kW",
      description: "Reliable 3kW inverter.",
      priceCents: 22999,
      currency: "GBP",
      stock: 25,
      brandId: bEco.id,
      categoryId: cInverters.id,
      images: { create: [{ tenantId, url: "https://picsum.photos/seed/invert3/800/600", alt: "Inverter 3kW", sortOrder: 0 }] },
    });

    await upsertProductByTenantSlug(tenantId, "heliotech-battery-10kwh", {
      name: "HelioTech Battery 10kWh",
      description: "High-capacity 10kWh battery.",
      priceCents: 49999,
      currency: "GBP",
      stock: 25,
      brandId: bHelio.id,
      categoryId: cBatteries.id,
      images: { create: [{ tenantId, url: "https://picsum.photos/seed/bat10/800/600", alt: "Battery 10kWh", sortOrder: 0 }] },
    });
  }

  await seedCatalog(tenantA.id);
  await seedCatalog(tenantB.id);

  console.log("Seeded OK:", {
    tenants: [tenantA.slug, tenantB.slug],
    users: [
      "admin@example.com",
      "superadmin@example.com",
      "owner+default@example.com",
      "admin+default@example.com",
      "editor+default@example.com",
      "ro+default@example.com",
      "owner+acme@example.com",
      "admin+acme@example.com",
      "editor+acme@example.com",
      "ro+acme@example.com",
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
