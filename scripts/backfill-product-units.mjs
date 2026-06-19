import { PrismaClient } from "../prisma/client/index.js";

async function main() {
  console.log("==========================================");
  console.log("⚡ BACKFILL PRODUCT UNIT CONFIGURATIONS");
  console.log("==========================================\n");

  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false
      }
    });

    console.log(`Found ${products.length} total products to check.\n`);
    let updatedCount = 0;
    const tableData = [];

    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        let needsUpdate = false;
        const updatedData = {};

        // 1. Resolve Primary Unit if missing
        if (!product.primaryUnit) {
          updatedData.primaryUnit = product.category === "QUANTITY" ? "PIECE" : "KG";
          needsUpdate = true;
        }

        const primaryUnit = updatedData.primaryUnit || product.primaryUnit;

        // 2. Resolve defaultSellingUnit if missing
        if (!product.defaultSellingUnit) {
          updatedData.defaultSellingUnit = primaryUnit;
          needsUpdate = true;
        }

        // 3. Resolve buyingRateUnit if missing
        if (!product.buyingRateUnit) {
          updatedData.buyingRateUnit = primaryUnit;
          needsUpdate = true;
        }

        // 4. Resolve sellingRateUnit if missing
        if (!product.sellingRateUnit) {
          updatedData.sellingRateUnit = primaryUnit;
          needsUpdate = true;
        }

        if (needsUpdate) {
          updatedCount++;
          await tx.product.update({
            where: { id: product.id },
            data: updatedData
          });

          tableData.push({
            id: product.id,
            name: product.name,
            original: `primary: ${product.primaryUnit || "null"}, selling: ${product.defaultSellingUnit || "null"}, buyingRate: ${product.buyingRateUnit || "null"}, sellingRate: ${product.sellingRateUnit || "null"}`,
            updated: `primary: ${primaryUnit}, selling: ${updatedData.defaultSellingUnit || product.defaultSellingUnit}, buyingRate: ${updatedData.buyingRateUnit || product.buyingRateUnit}, sellingRate: ${updatedData.sellingRateUnit || product.sellingRateUnit}`
          });
        }
      }
    });

    if (updatedCount > 0) {
      console.log(`✅ Successfully backfilled ${updatedCount} product(s) with unit configurations:\n`);
      console.table(tableData);
    } else {
      console.log("✅ All products already have valid unit configurations. No backfill needed.");
    }
  } catch (error) {
    console.error("❌ Product configuration backfill failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
