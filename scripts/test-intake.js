const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log("--- Testing Intake & Advance Persistence ---");
    
    // 1. Get first supplier and product
    const supplier = await prisma.party.findFirst({
      where: { partyType: { in: ["SUPPLIER", "BOTH"] }, isActive: true }
    });
    const product = await prisma.product.findFirst({
      where: { isActive: true }
    });

    if (!supplier || !product) {
      throw new Error("Seed data missing. Run seed-realistic.js first.");
    }

    console.log(`Using Supplier: ${supplier.name}, Product: ${product.name}`);

    // 2. Create Intake
    // Manual intakeNumber generation simulation (same as Repository)
    const lastEntry = await prisma.intakeTransaction.findFirst({ orderBy: { id: "desc" } });
    const nextId = lastEntry ? lastEntry.id + 1 : 1;
    const intakeNumber = `INT-${nextId.toString().padStart(6, "0")}`;

    const intake = await prisma.intakeTransaction.create({
      data: {
        intakeNumber,
        partyId: supplier.id,
        productId: product.id,
        bagCount: 50,
        grossWeight: 2500,
        entryDate: new Date(),
        status: "PENDING"
      }
    });

    console.log(`Intake created: ${intake.intakeNumber} (ID: ${intake.id})`);

    // 3. Create linked Advance
    const advance = await prisma.intakeAdvance.create({
      data: {
        partyId: supplier.id,
        intakeTransactionId: intake.id,
        amount: 5000,
        notes: `Advance for ${intake.intakeNumber}`
      }
    });

    console.log(`Advance recorded: Rs. ${advance.amount} linked to ${intake.intakeNumber}`);

    // 4. Verification
    const fetchedIntake = await prisma.intakeTransaction.findUnique({
      where: { id: intake.id },
      include: { advances: true }
    });

    if (fetchedIntake.advances.length === 1 && fetchedIntake.advances[0].amount.toString() === "5000.00") {
      console.log("\n--- Step 3 Persistence Check SUCCESS ---");
    } else {
      console.error("\n--- Verification FAILED: Linked advance mismatch ---");
      console.log(fetchedIntake.advances);
    }

  } catch (error) {
    console.error("\n--- Step 3 Persistence Check FAILED ---");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
