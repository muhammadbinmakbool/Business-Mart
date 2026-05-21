const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  
  const parties = [
    { name: "Ali Ahmed Traders", phoneNumber: "0300-1112223", partyType: "BOTH", address: "Galla Mandi, Lahore" },
    { name: "Siddique & Sons", phoneNumber: "0321-4445556", partyType: "SUPPLIER", address: "Raiwind Road" },
    { name: "Khan Broilers", phoneNumber: "0333-7778889", partyType: "BUYER", address: "Kasur" },
    { name: "Madina Fertilizers", phoneNumber: "0345-9990001", partyType: "SUPPLIER" },
    { name: "Ittifaq Sugar Mills", phoneNumber: "0312-3334445", partyType: "SUPPLIER" },
    { name: "Usman Karyana Store", phoneNumber: "0301-2223334", partyType: "BUYER" },
    { name: "Zubair Seed Corp", phoneNumber: "0305-6667778", partyType: "BOTH" },
    { name: "Green Field Agriculture", phoneNumber: "0322-8889990", partyType: "SUPPLIER" },
    { name: "Punjab Grain Traders", phoneNumber: "0331-5556667", partyType: "BOTH" },
    { name: "Faisalabad Fabrics", phoneNumber: "0341-1110009", partyType: "BUYER" },
    { name: "National Pesticides", phoneNumber: "0311-2224446", partyType: "SUPPLIER" },
    { name: "Rehman & Co", phoneNumber: "0302-3335557", partyType: "BUYER" },
    { name: "Sunrise Oil Mills", phoneNumber: "0303-4446668", partyType: "SUPPLIER" },
    { name: "Blue Sky Exporters", phoneNumber: "0304-5557779", partyType: "BOTH" },
    { name: "Global Logistics", phoneNumber: "0306-7779991", partyType: "SUPPLIER" }
  ];

  const products = [
    { name: "Basmati Rice", category: "WEIGHT", primaryUnit: "KG", unitConversion: 50 },
    { name: "Wheat (Gandum)", category: "WEIGHT", primaryUnit: "KG", unitConversion: 40 },
    { name: "Sugar", category: "WEIGHT", primaryUnit: "KG", unitConversion: 50 },
    { name: "Cooking Oil", category: "QUANTITY", primaryUnit: "PIECE" },
    { name: "Corn (Makkai)", category: "WEIGHT", primaryUnit: "KG", unitConversion: 40 },
    { name: "Fertilizer Urea", category: "WEIGHT", primaryUnit: "KG", unitConversion: 50 },
    { name: "Cotton Seeds", category: "WEIGHT", primaryUnit: "KG", unitConversion: 40 },
    { name: "Red Chili", category: "WEIGHT", primaryUnit: "KG" },
    { name: "Salt", category: "WEIGHT", primaryUnit: "KG" },
    { name: "Daal Chana", category: "WEIGHT", primaryUnit: "KG" }
  ];

  console.log("Cleaning existing data...");
  await prisma.salesTrack.deleteMany({});
  await prisma.supplierInvoiceItem.deleteMany({});
  await prisma.intakeAdvance.deleteMany({});
  await prisma.supplierInvoice.deleteMany({});
  await prisma.intakeTransaction.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.transactionAdjustment.deleteMany({});
  await prisma.saleTransaction.deleteMany({});
  await prisma.party.deleteMany({});
  await prisma.product.deleteMany({});

  console.log("Seeding realistic data...");

  for (const p of parties) {
    await prisma.party.create({ data: { ...p, isActive: true } });
  }

  for (const p of products) {
    await prisma.product.create({ data: { ...p, isActive: true } });
  }

  console.log("Seeding complete!");
  await prisma.$disconnect();
}

main();
