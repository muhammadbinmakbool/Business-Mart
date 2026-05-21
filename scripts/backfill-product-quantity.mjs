import { PrismaClient } from "@prisma/client";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Product Quantity Backfill — Pending Intakes Only
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * This script recalculates Product.quantity for all products based on the
 * Inventory Philosophy:
 *
 *   Product.quantity = SUM(normalizedWeight) of IntakeTransactions
 *                      WHERE status = "PENDING"
 *
 * normalizedWeight is derived from grossWeight (the raw arriving weight).
 * Net weight values are billing/settlement concerns and do NOT affect inventory.
 * Sales invoices do NOT modify inventory — only Intake lifecycle does.
 * ══════════════════════════════════════════════════════════════════════════════
 */

async function main() {
  console.log("==================================================");
  console.log("⚡ PRODUCT QUANTITY BACKFILL — PENDING INTAKES ONLY ⚡");
  console.log("==================================================\n");

  const prisma = new PrismaClient({
    log: ["error"]
  });

  try {
    // 1. Fetch all products
    const products = await prisma.product.findMany();
    console.log(`Found ${products.length} products to synchronize.\n`);

    // 2. Fetch sum of normalizedWeight for PENDING intakes per product
    const intakes = await prisma.intakeTransaction.groupBy({
      by: ["productId"],
      where: {
        status: "PENDING"
      },
      _sum: {
        normalizedWeight: true
      }
    });
    const intakeMap = new Map(intakes.map(i => [i.productId, Number(i._sum.normalizedWeight || 0)]));

    // 3. Update Product.quantity inside a single transaction
    console.log("Running alignment transaction batch...");
    const tableData = [];

    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const pendingStock = intakeMap.get(product.id) || 0;
        const oldQuantity = Number(product.quantity || 0);

        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: pendingStock
          }
        });

        tableData.push({
          productId: product.id,
          productName: product.name,
          oldQuantity: oldQuantity.toFixed(2),
          newQuantity: pendingStock.toFixed(2),
          delta: (pendingStock - oldQuantity).toFixed(2)
        });
      }
    });

    console.log("\n✅ Database alignment sync completed successfully!\n");
    console.table(tableData);

    // 4. Verification: Manually validate a sample
    if (products.length > 0) {
      console.log("\n--- E2E VERIFICATION RUN ---");
      const samples = products.slice(0, 3);
      for (const sample of samples) {
        const pendingSum = intakeMap.get(sample.id) || 0;

        const verifiedProduct = await prisma.product.findUnique({
          where: { id: sample.id }
        });

        console.log(`Product: "${sample.name}" (ID: ${sample.id})`);
        console.log(`  - Pending Intakes Sum   : ${pendingSum.toFixed(2)} KG`);
        console.log(`  - Product.quantity (DB)  : ${Number(verifiedProduct.quantity).toFixed(2)} KG`);
        
        if (Math.abs(pendingSum - Number(verifiedProduct.quantity)) < 0.001) {
          console.log("  => STATUS: MATCHED & VERIFIED! ✅");
        } else {
          console.error("  => STATUS: MISMATCH DETECTED! ❌");
        }
      }
    }

  } catch (error) {
    console.error("\n❌ Alignment and Backfill failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
