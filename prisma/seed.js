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

  // Create default Adjustment Definitions
  const defaultAdjustments = [
    {
      code: "COMMISSION",
      name: "Commission",
      method: "PERCENTAGE",
      direction: "SUBTRACT",
      defaultConfiguredValue: 1.5,
      applicableTo: "SUPPLIER",
      isSystemDefined: true,
      isEnabledByDefault: true,
      isActive: true,
      displayOrder: 1,
      description: "Standard supplier sales commission percentage."
    },
    {
      code: "LABOUR_BUYER",
      name: "Labour (Buyer)",
      method: "PER_WEIGHT",
      direction: "ADD",
      defaultConfiguredValue: 2.0,
      applicableTo: "BUYER",
      isSystemDefined: true,
      isEnabledByDefault: true,
      isActive: true,
      displayOrder: 2,
      description: "Buyer labour charge per unit weight."
    },
    {
      code: "LABOUR_SUPPLIER",
      name: "Labour (Supplier)",
      method: "PER_WEIGHT",
      direction: "SUBTRACT",
      defaultConfiguredValue: 2.0,
      applicableTo: "SUPPLIER",
      isSystemDefined: true,
      isEnabledByDefault: true,
      isActive: true,
      displayOrder: 3,
      description: "Supplier labour charge per unit weight."
    },
    {
      code: "GST",
      name: "GST",
      method: "PERCENTAGE",
      direction: "ADD",
      defaultConfiguredValue: 17.0,
      applicableTo: "BUYER",
      isSystemDefined: true,
      isEnabledByDefault: false,
      isActive: true,
      displayOrder: 4,
      description: "General Sales Tax."
    },
    {
      code: "DISCOUNT",
      name: "Discount",
      method: "FIXED",
      direction: "SUBTRACT",
      defaultConfiguredValue: 0.0,
      applicableTo: "BUYER",
      isSystemDefined: true,
      isEnabledByDefault: false,
      isActive: true,
      displayOrder: 5,
      description: "Flat rate buyer discount."
    },
    {
      code: "BROKERAGE",
      name: "Brokerage",
      method: "PER_WEIGHT",
      direction: "SUBTRACT",
      defaultConfiguredValue: 0.5,
      applicableTo: "SUPPLIER",
      isSystemDefined: true,
      isEnabledByDefault: false,
      isActive: true,
      displayOrder: 6,
      description: "Broker commission fee per unit weight."
    },
    {
      code: "AARHAT",
      name: "Aarhat",
      method: "PERCENTAGE",
      direction: "SUBTRACT",
      defaultConfiguredValue: 1.0,
      applicableTo: "SUPPLIER",
      isSystemDefined: true,
      isEnabledByDefault: false,
      isActive: true,
      displayOrder: 7,
      description: "Market intermediary commission fee."
    }
  ];

  for (const adj of defaultAdjustments) {
    await prisma.adjustmentDefinition.upsert({
      where: { code: adj.code },
      update: {},
      create: adj
    });
    console.log(`✅ Default AdjustmentDefinition seeded/verified: ${adj.code}`);
  }

  // Seed Unit Categories
  const categories = [
    { code: "WEIGHT", name: "Weight" },
    { code: "LIQUID", name: "Liquid" },
    { code: "QUANTITY", name: "Quantity" }
  ];

  const categoryMap = {};
  for (const cat of categories) {
    const dbCat = await prisma.unitCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name },
      create: { code: cat.code, name: cat.name }
    });
    categoryMap[cat.code] = dbCat.id;
    console.log(`✅ UnitCategory seeded/verified: ${cat.code} (ID: ${dbCat.id})`);
  }

  // Seed Units
  const units = [
    // WEIGHT
    { code: "KG", name: "Kilogram", unitCategoryCode: "WEIGHT", isBase: true, isCustom: false, conversionRate: 1.0 },
    { code: "MAUND", name: "Maund", unitCategoryCode: "WEIGHT", isBase: false, isCustom: false, conversionRate: 40.0 },
    { code: "G", name: "Gram", unitCategoryCode: "WEIGHT", isBase: false, isCustom: false, conversionRate: 0.001 },
    
    // LIQUID
    { code: "LITER", name: "Liter", unitCategoryCode: "LIQUID", isBase: true, isCustom: false, conversionRate: 1.0 },
    { code: "ML", name: "Milliliter", unitCategoryCode: "LIQUID", isBase: false, isCustom: false, conversionRate: 0.001 },
    
    // QUANTITY
    { code: "PIECE", name: "Piece", unitCategoryCode: "QUANTITY", isBase: true, isCustom: false, conversionRate: 1.0 }
  ];

  for (const u of units) {
    const unitCategoryId = categoryMap[u.unitCategoryCode];
    if (!unitCategoryId) {
      console.warn(`⚠️ Skipping unit ${u.code}: Category ${u.unitCategoryCode} not found.`);
      continue;
    }
    await prisma.unit.upsert({
      where: { code: u.code },
      update: {
        name: u.name,
        unitCategoryId,
        isBase: u.isBase,
        isCustom: u.isCustom,
        conversionRate: u.conversionRate
      },
      create: {
        code: u.code,
        name: u.name,
        unitCategoryId,
        isBase: u.isBase,
        isCustom: u.isCustom,
        conversionRate: u.conversionRate
      }
    });
    console.log(`✅ Unit seeded/verified: ${u.code} under category ${u.unitCategoryCode}`);
  }
  
  // Clean up deprecated units
  const activeCodes = units.map(u => u.code);
  const deletedUnits = await prisma.unit.deleteMany({
    where: {
      code: { notIn: activeCodes }
    }
  });
  if (deletedUnits.count > 0) {
    console.log(`🧹 Deleted ${deletedUnits.count} deprecated/unused units from the database.`);
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
