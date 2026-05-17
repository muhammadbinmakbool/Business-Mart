import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("==================================================");
  console.log("⚡ PRODUCT TABLE DATA ALIGNMENT & BACKFILL SYNC ⚡");
  console.log("==================================================\n");

  const prisma = new PrismaClient({
    log: ["error"]
  });

  try {
    // 1. Fetch all products
    const products = await prisma.product.findMany();
    console.log(`Found ${products.length} products to synchronize.\n`);

    // 2. Fetch and sum all active intakes per product
    const intakes = await prisma.intakeTransaction.groupBy({
      by: ["productId"],
      where: {
        status: { not: "CANCELLED" }
      },
      _sum: {
        normalizedWeight: true
      }
    });
    const intakeMap = new Map(intakes.map(i => [i.productId, Number(i._sum.normalizedWeight || 0)]));

    // 3. Fetch and sum all active sale items per product (excluding deleted and cancelled transactions)
    const activeSales = await prisma.saleItem.findMany({
      where: {
        sale: {
          isDeleted: false,
          status: { not: "CANCELLED" }
        }
      }
    });

    const saleMap = new Map();
    for (const saleItem of activeSales) {
      const current = saleMap.get(saleItem.productId) || 0;
      saleMap.set(saleItem.productId, current + Number(saleItem.normalizedWeight || 0));
    }

    // 4. Update Product.quantity inside a single transaction or controlled batch process
    console.log("Running alignment transaction batch...");
    const tableData = [];

    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const totalIntake = intakeMap.get(product.id) || 0;
        const totalSales = saleMap.get(product.id) || 0;
        const newQuantity = totalIntake - totalSales;

        // Fetch current quantity to log
        const oldQuantity = Number(product.quantity || 0);

        // Update the Product snapshot stock quantity (strictly in base unit)
        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: newQuantity
          }
        });

        tableData.push({
          productId: product.id,
          productName: product.name,
          oldQuantity: oldQuantity.toFixed(2),
          newQuantity: newQuantity.toFixed(2)
        });
      }
    });

    console.log("\n✅ Database alignment sync completed successfully!\n");
    console.table(tableData);

    // 5. Verification: Manually calculate a sample product
    if (products.length > 0) {
      console.log("\n--- E2E VERIFICATION RUN ---");
      // Choose 3 products as a sample size
      const samples = products.slice(0, 3);
      for (const sample of samples) {
        const totalIn = intakeMap.get(sample.id) || 0;
        const totalOut = saleMap.get(sample.id) || 0;
        const derivedValue = totalIn - totalOut;

        const verifiedProduct = await prisma.product.findUnique({
          where: { id: sample.id }
        });

        console.log(`Product: "${sample.name}" (ID: ${sample.id})`);
        console.log(`  - Manually Calculated derived stock: ${derivedValue.toFixed(2)} KG`);
        console.log(`  - Product.quantity Snapshot stock  : ${Number(verifiedProduct.quantity).toFixed(2)} KG`);
        
        if (Math.abs(derivedValue - Number(verifiedProduct.quantity)) < 0.001) {
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
