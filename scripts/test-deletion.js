const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testDeletion() {
  console.log("--- Testing Cascading Deletes ---");

  // 1. Get a random sale
  const sale = await prisma.saleTransaction.findFirst({
    include: { items: true, adjustments: true }
  });

  if (!sale) {
    console.error("No sales found to test deletion.");
    return;
  }

  console.log(`Deleting Sale ${sale.saleNumber} (ID: ${sale.id})...`);
  
  // Use the logic from Repository (simulated here)
  await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
  await prisma.transactionAdjustment.deleteMany({ where: { saleId: sale.id } });
  await prisma.saleTransaction.delete({ where: { id: sale.id } });

  // 2. Verify cleanup
  const itemsCount = await prisma.saleItem.count({ where: { saleId: sale.id } });
  const adjustmentsCount = await prisma.transactionAdjustment.count({ where: { saleId: sale.id } });
  const saleExists = await prisma.saleTransaction.findUnique({ where: { id: sale.id } });

  if (itemsCount === 0 && adjustmentsCount === 0 && !saleExists) {
    console.log("✅ Deletion test passed: Sale and all related items/adjustments purged.");
  } else {
    console.error("❌ Deletion test failed: Orphans remained in the database!");
    console.error(`   Items remaining: ${itemsCount}`);
    console.error(`   Adjustments remaining: ${adjustmentsCount}`);
    console.error(`   Sale still exists: ${!!saleExists}`);
  }

  console.log("----------------------------------");
}

testDeletion()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
