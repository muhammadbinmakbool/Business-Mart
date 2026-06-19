const { PrismaClient } = require("../prisma/client");

const prisma = new PrismaClient();

function getRandomDate() {
  const now = new Date();
  const pastDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  return pastDate;
}

async function main() {
  console.log("🌱 Starting Stress Data Seeding...");
  const targetCount = 4500;
  const batchSize = 100;

  // 1. Ensure stress parties exist
  console.log("👥 Checking Suppliers and Buyers...");
  const suppliers = [];
  const buyers = [];

  for (let i = 1; i <= 10; i++) {
    const sName = `Stress Supplier ${i}`;
    let supplier = await prisma.party.findFirst({ where: { name: sName } });
    if (!supplier) {
      supplier = await prisma.party.create({
        data: {
          name: sName,
          phoneNumber: `030012345${i.toString().padStart(2, "0")}`,
          partyType: "SUPPLIER",
          isActive: true
        }
      });
    }
    suppliers.push(supplier);

    const bName = `Stress Buyer ${i}`;
    let buyer = await prisma.party.findFirst({ where: { name: bName } });
    if (!buyer) {
      buyer = await prisma.party.create({
        data: {
          name: bName,
          phoneNumber: `032112345${i.toString().padStart(2, "0")}`,
          partyType: "BUYER",
          isActive: true
        }
      });
    }
    buyers.push(buyer);
  }

  // 2. Ensure enough products exist (up to 400)
  console.log("📦 Checking Product count...");
  let existingProducts = await prisma.product.findMany({ where: { isActive: true } });
  
  if (existingProducts.length < 400) {
    const productsNeeded = 400 - existingProducts.length;
    console.log(`📦 Seeding ${productsNeeded} additional products to reach 400...`);
    for (let i = 1; i <= productsNeeded; i++) {
      const prod = await prisma.product.create({
        data: {
          name: `Stress Product ${existingProducts.length + i}`,
          category: "WEIGHT",
          unitCategory: "WEIGHT",
          primaryUnit: "KG",
          defaultSellingUnit: "KG",
          buyingRateUnit: "KG",
          sellingRateUnit: "KG",
          isActive: true
        }
      });
      existingProducts.push(prod);
    }
  }

  // 3. Batch Seeding Intake, Sales, and Settlements
  console.log(`🚀 Seeding ${targetCount} transaction records in batches of ${batchSize}...`);
  
  for (let start = 0; start < targetCount; start += batchSize) {
    const end = Math.min(start + batchSize, targetCount);
    console.log(`⏳ Processing batch ${start + 1} to ${end}...`);

    await prisma.$transaction(async (tx) => {
      for (let i = start + 1; i <= end; i++) {
        const entryDate = getRandomDate();
        const supplier = suppliers[i % suppliers.length];
        const buyer = buyers[i % buyers.length];
        const product = existingProducts[i % existingProducts.length];
        const rate = 45 + (i % 25); // rate between 45 and 70 Rs/KG
        const saleRate = rate + 5;
        const weight = 1000;
        const intakeAmount = rate * weight;
        const saleAmount = saleRate * weight;

        const suffix = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase() + i;

        // A. Create IntakeTransaction
        const intake = await tx.intakeTransaction.create({
          data: {
            intakeNumber: `INT-S-${suffix}`,
            entryDate,
            partyId: supplier.id,
            productId: product.id,
            bagCount: 20,
            rate: rate.toString(),
            rateUnit: "KG",
            grossWeight: weight.toString(),
            unit: "KG",
            normalizedWeight: weight.toString(),
            netWeight: weight.toString(),
            remainingWeight: "0.00",
            status: "SOLD"
          }
        });

        // B. Create SaleTransaction
        const sale = await tx.saleTransaction.create({
          data: {
            saleNumber: `SAL-S-${suffix}`,
            entryDate,
            partyId: buyer.id,
            totalWeight: weight.toString(),
            baseAmount: saleAmount.toString(),
            totalAdjustments: "0.00",
            finalAmount: saleAmount.toString(),
            status: "CLEARED",
            paidAmount: saleAmount.toString(),
            paymentStatus: "CLEARED"
          }
        });

        // C. Create SaleItem
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: product.id,
            weight: weight.toString(),
            unit: "KG",
            normalizedWeight: weight.toString(),
            rate: saleRate.toString(),
            amount: saleAmount.toString()
          }
        });

        // D. Create SalesTrack
        await tx.salesTrack.create({
          data: {
            saleTransactionId: sale.id,
            saleItemId: saleItem.id,
            intakeTransactionId: intake.id,
            type: "INTAKE_SALE",
            supplierPartyId: supplier.id,
            buyerPartyId: buyer.id,
            productId: product.id,
            quantity: weight.toString(),
            buyingRate: rate.toString(),
            sellingRate: saleRate.toString(),
            netWeight: weight.toString(),
            baseAmount: intakeAmount.toString(),
            isBilled: true,
            isSettled: true
          }
        });

        // E. Create SupplierInvoice
        const invoice = await tx.supplierInvoice.create({
          data: {
            invoiceNumber: `SUP-S-${suffix}`,
            partyId: supplier.id,
            entryDate,
            totalGrossValue: intakeAmount.toString(),
            totalDeductions: "0.00",
            totalAdvances: "0.00",
            finalPayableAmount: intakeAmount.toString(),
            status: "CLEARED",
            paidAmount: intakeAmount.toString(),
            paymentStatus: "CLEARED"
          }
        });

        // F. Create SupplierInvoiceItem
        await tx.supplierInvoiceItem.create({
          data: {
            supplierInvoiceId: invoice.id,
            intakeTransactionId: intake.id,
            weight: weight.toString(),
            rate: rate.toString(),
            amount: intakeAmount.toString()
          }
        });
      }
    }, { timeout: 30000 });
  }

  console.log("✅ Stress Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Stress Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
