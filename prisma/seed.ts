// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Category
  const cat = await prisma.category.upsert({
    where: { slug: "solar-panels" },
    update: {},
    create: { name: "Solar Panels", slug: "solar-panels" },
  });

  // Primary brand used by the sample product
  const sunlite = await prisma.brand.upsert({
    where: { slug: "sunlite" },
    update: {},
    create: {
      name: "SunLite",
      slug: "sunlite",
      description: "Premium solar components.",
      websiteUrl: "https://www.sunlite.com",
      logoUrl: "https://picsum.photos/seed/sunlite/200/200",
    },
  });

  // Extra brands for pagination/testing
  const brandNames = [
    "SolarMax",
    "EcoPower",
    "BrightVolt",
    "Photonix",
    "HelioTech",
    "Sunergy",
    "GreenRay",
    "SolarWorks",
    "Lumina",
    "VoltEdge",
    "AuroraSolar",
    "ZenithEnergy",
    "NovaVolt",
    "Radiant",
    "ClearSky",
    "BlueSun",
    "Solaris",
    "TerraWatt",
    "PureSun",
  ];

  for (const name of brandNames) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        description: `${name} is a trusted brand for solar and renewable energy solutions.`,
        websiteUrl: `https://www.${slug}.com`,
        logoUrl: `https://picsum.photos/seed/${slug}/200/200`,
      },
    });
  }

  // Sample product linked to SunLite
  const product = await prisma.product.upsert({
    where: { slug: "sunlite-400w" },
    update: {},
    create: {
      name: "SunLite 400W Panel",
      slug: "sunlite-400w",
      description: "High-efficiency 400W monocrystalline panel.",
      priceCents: 14999,
      currency: "GBP",
      stock: 25,
      categoryId: cat.id,
      brandId: sunlite.id, // ✅ link product to brand
      images: {
        create: [
          {
            url: "https://picsum.photos/seed/panel/800/600",
            alt: "Panel front",
            sortOrder: 0,
          },
        ],
      },
    },
  });

  // Admin user
  const adminEmail = "admin@example.com";
  const adminPass = "Admin123!"; // ⚠️ dev only

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPass, 10),
    },
  });

  console.log("Seeded:", {
    category: cat.slug,
    brand: sunlite.slug,
    product: product.slug,
    admin: admin.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
