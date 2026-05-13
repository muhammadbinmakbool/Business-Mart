const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkConsistency() {
  console.log("--- Database Consistency Audit ---");

  const sales = await prisma.saleTransaction.findMany({
    include: { items: true, adjustments: true }
  });

  let totalErrors = 0;

  for (const sale of sales) {
    const calcBaseAmount = sale.items.reduce((acc, item) => acc + Number(item.amount), 0);
    const calcTotalAdjustments = sale.adjustments.reduce((acc, adj) => {
      const amt = Number(adj.calculatedAmount);
      return adj.direction === "SUBTRACT" ? acc - amt : acc + amt;
    }, 0);
    const calcFinalAmount = calcBaseAmount + calcTotalAdjustments;

    // Tolerance for floating point differences (should be 0 because we round)
    const baseDiff = Math.abs(calcBaseAmount - Number(sale.baseAmount));
    const finalDiff = Math.abs(calcFinalAmount - Number(sale.finalAmount));

    if (baseDiff > 0.01 || finalDiff > 0.01) {
      console.error(`❌ Mismatch in Sale ${sale.saleNumber} (ID: ${sale.id})`);
      console.error(`   Stored Base: ${sale.baseAmount}, Calc Base: ${calcBaseAmount}`);
      console.error(`   Stored Final: ${sale.finalAmount}, Calc Final: ${calcFinalAmount}`);
      totalErrors++;
    }

    // Verify relations
    if (sale.items.length === 0) {
      console.warn(`⚠️ Sale ${sale.saleNumber} has NO items.`);
    }
  }

  if (totalErrors === 0) {
    console.log("✅ All totals verified and consistent across items and adjustments.");
  } else {
    console.error(`❌ Found ${totalErrors} consistency errors.`);
  }

  console.log("----------------------------------");
}

checkConsistency()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
