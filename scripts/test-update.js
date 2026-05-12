const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log("--- Testing Intake Update Persistence ---");
    
    // 1. Get the last intake
    const intake = await prisma.intakeTransaction.findFirst({
      orderBy: { id: "desc" }
    });

    if (!intake) {
      throw new Error("No intake found. Run test-intake.js first.");
    }

    console.log(`Original Intake: ${intake.intakeNumber}, Weight: ${intake.grossWeight}`);

    // 2. Update Intake
    const updated = await prisma.intakeTransaction.update({
      where: { id: intake.id },
      data: {
        grossWeight: 3000,
        notes: "Updated via test script"
      }
    });

    console.log(`Updated Intake: ${updated.intakeNumber}, Weight: ${updated.grossWeight}`);

    if (updated.grossWeight.toString() === "3000.00") {
      console.log("\n--- Step 3 Update Check SUCCESS ---");
    } else {
      console.error("\n--- Verification FAILED: Weight mismatch ---");
    }

  } catch (error) {
    console.error("\n--- Step 3 Update Check FAILED ---");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
