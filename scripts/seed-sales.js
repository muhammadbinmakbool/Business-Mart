const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedSales() {
  console.log("Seeding 30 realistic sales...");

  const buyers = await prisma.party.findMany({
    where: { 
      isActive: true,
      OR: [{ partyType: "BUYER" }, { partyType: "BOTH" }] 
    }
  });
  
  const products = await prisma.product.findMany({ where: { isActive: true } });

  if (buyers.length === 0 || products.length === 0) {
    console.error("Not enough buyers or products to seed sales. Please create them first.");
    return;
  }

  const adjustmentTypes = [
    { type: "Commission", method: "PERCENTAGE", value: 2, direction: "ADD" },
    { type: "Labour", method: "PER_WEIGHT", value: 1.5, direction: "ADD" },
    { type: "Market Fee", method: "PERCENTAGE", value: 0.5, direction: "ADD" },
    { type: "Rent", method: "FIXED", value: 500, direction: "ADD" },
    { type: "Kaat", method: "PER_WEIGHT", value: 2, direction: "SUBTRACT" }
  ];

  for (let i = 1; i <= 30; i++) {
    const buyer = buyers[Math.floor(Math.random() * buyers.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days

    // 1-3 items
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let baseAmount = 0;
    let totalWeight = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const weight = Math.floor(Math.random() * 5000) + 100;
      const rate = Math.floor(Math.random() * 200) + 50;
      const amount = weight * rate;
      
      items.push({
        productId: product.id,
        weight,
        rate,
        amount
      });
      
      baseAmount += amount;
      totalWeight += weight;
    }

    // 1-2 adjustments
    const numAdjs = Math.floor(Math.random() * 2) + 1;
    const adjustments = [];
    let totalAdjustments = 0;

    for (let j = 0; j < numAdjs; j++) {
      const adjRef = adjustmentTypes[Math.floor(Math.random() * adjustmentTypes.length)];
      let calcAmt = 0;
      
      if (adjRef.method === "PERCENTAGE") {
        calcAmt = (adjRef.value / 100) * baseAmount;
      } else if (adjRef.method === "PER_WEIGHT") {
        calcAmt = adjRef.value * totalWeight;
      } else {
        calcAmt = adjRef.value;
      }

      adjustments.push({
        adjustmentType: adjRef.type,
        method: adjRef.method,
        value: adjRef.value,
        direction: adjRef.direction,
        calculatedAmount: calcAmt
      });

      if (adjRef.direction === "SUBTRACT") {
        totalAdjustments -= calcAmt;
      } else {
        totalAdjustments += calcAmt;
      }
    }

    const finalAmount = baseAmount + totalAdjustments;

    // Get next sale number
    const lastSale = await prisma.saleTransaction.findFirst({ orderBy: { id: "desc" } });
    const nextId = lastSale ? lastSale.id + 1 : 1;
    const saleNumber = `SAL-${nextId.toString().padStart(6, "0")}`;

    await prisma.saleTransaction.create({
      data: {
        saleNumber,
        entryDate: date,
        partyId: buyer.id,
        totalWeight,
        baseAmount,
        totalAdjustments,
        finalAmount,
        status: i % 10 === 0 ? "COMPLETED" : "PENDING",
        notes: `Realistic seed sale #${i}`,
        items: { create: items },
        adjustments: { create: adjustments }
      }
    });
  }

  console.log("Successfully seeded 30 sales.");
}

seedSales()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
