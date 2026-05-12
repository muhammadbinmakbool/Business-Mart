const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log("--- Testing Party Persistence ---");
    const party = await prisma.party.create({
      data: {
        name: "Database Test Supplier",
        phoneNumber: "0333-1112233",
        partyType: "SUPPLIER",
        address: "123 Test Street",
        isActive: true
      }
    });
    console.log("Party created:", party.id, party.name);

    const fetchedParty = await prisma.party.findUnique({
      where: { id: party.id }
    });
    console.log("Party fetched:", fetchedParty.name);

    console.log("\n--- Testing Product Persistence ---");
    const product = await prisma.product.create({
      data: {
        name: "Database Test Product",
        unitType: "KG",
        isActive: true
      }
    });
    console.log("Product created:", product.id, product.name);

    const fetchedProduct = await prisma.product.findUnique({
      where: { id: product.id }
    });
    console.log("Product fetched:", fetchedProduct.name);

    console.log("\n--- Persistence Check SUCCESS ---");
  } catch (error) {
    console.error("\n--- Persistence Check FAILED ---");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
