const { PrismaClient } = require("./client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default Admin user
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@businessmart.com" },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.create({
      data: {
        email: "admin@businessmart.com",
        name: "Admin",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log(`✅ Default Admin user created: ${admin.email} (ID: ${admin.id})`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${existingAdmin.email}`);
  }

  // Create default Super Admin user
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: "superadmin@businessmart.com" },
  });

  if (!existingSuperAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const superAdmin = await prisma.user.create({
      data: {
        email: "superadmin@businessmart.com",
        name: "Super Admin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    console.log(`✅ Default Super Admin user created: ${superAdmin.email} (ID: ${superAdmin.id})`);
  } else {
    console.log(`ℹ️  Super Admin user already exists: ${existingSuperAdmin.email}`);
  }

  console.log("🌱 Seeding complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
