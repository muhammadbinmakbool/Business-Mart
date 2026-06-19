import { PrismaClient } from "../prisma/client/index.js";
import { getProductValidationState } from "../src/modules/products/utils/productValidation.js";

async function main() {
  console.log("==========================================");
  console.log("🔍 ACTIVE PRODUCTS CONFIGURATION AUDIT");
  console.log("==========================================\n");

  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isDeleted: false
      }
    });

    console.log(`Auditing ${products.length} active products...\n`);

    let invalidCount = 0;
    const tableData = [];

    for (const product of products) {
      const state = getProductValidationState(product);
      if (!state.isValid) {
        invalidCount++;
        tableData.push({
          id: product.id,
          name: product.name,
          missingFields: state.errors.join(", ")
        });
      }
    }

    if (invalidCount > 0) {
      console.warn(`⚠️ Found ${invalidCount} active product(s) with missing unit configuration fields:\n`);
      console.table(tableData);
      console.warn("\nPlease update these products via the product configuration UI or run the backfill migration script.");
    } else {
      console.log("✅ All active products are fully configured and operational!");
    }
  } catch (error) {
    console.error("❌ Product configuration audit failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
