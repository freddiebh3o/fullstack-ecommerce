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

  // Product
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
  const adminPass = "Admin123!"; // ⚠️ for dev only, change in prod

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
