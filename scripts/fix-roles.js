// scripts/fix-roles.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // group roles by (tenantId, key)
  const roles = await prisma.role.findMany({
    select: { id: true, tenantId: true, key: true },
  });

  const byTenantKey = new Map();
  for (const r of roles) {
    const k = `${r.tenantId}::${r.key}`;
    if (!byTenantKey.has(k)) byTenantKey.set(k, []);
    byTenantKey.get(k).push(r.id);
  }

  for (const [k, ids] of byTenantKey.entries()) {
    if (ids.length <= 1) continue;

    // keep the first as canonical
    const [canonical, ...dupes] = ids;

    console.log("Merging duplicate roles", k, { canonical, dupes });

    // Point memberships at canonical
    await prisma.membership.updateMany({
      where: { roleId: { in: dupes } },
      data: { roleId: canonical },
    });

    // Remove dupes' permission assignments (your seed will recreate)
    await prisma.permissionAssignment.deleteMany({
      where: { roleId: { in: dupes } },
    });

    // Delete duplicate roles
    await prisma.role.deleteMany({
      where: { id: { in: dupes } },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
