const { IntakeService } = require("../src/modules/intake/services/IntakeService");
const { PrismaClient } = require("@prisma/client");

// Note: Using the Service instead of direct Prisma to test the coercion logic
async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log("--- Testing Intake Service Update Coercion ---");
    
    const lastIntake = await prisma.intakeTransaction.findFirst({ orderBy: { id: "desc" } });
    if (!lastIntake) throw new Error("No intake found.");

    console.log(`Original Intake: ${lastIntake.intakeNumber}, PartyId: ${lastIntake.partyId} (Type: ${typeof lastIntake.partyId})`);

    // Mimic formData strings
    const mockData = {
      partyId: lastIntake.partyId.toString(),
      productId: lastIntake.productId.toString(),
      grossWeight: "3500.50",
      notes: "Updated via service coercion test"
    };

    console.log("Updating with strings...");
    const updated = await IntakeService.updateIntake(lastIntake.id, mockData);

    console.log(`Updated Intake: ${updated.intakeNumber}, PartyId: ${updated.partyId} (Type: ${typeof updated.partyId})`);
    console.log(`New Weight: ${updated.grossWeight} (Type: ${typeof updated.grossWeight})`);

    if (typeof updated.partyId === 'number' && updated.grossWeight.toString() === "3500.5") {
       console.log("\n--- Service Coercion Check SUCCESS ---");
    } else {
       console.error("\n--- Verification FAILED ---");
    }

  } catch (error) {
    console.error("\n--- Service Coercion Check FAILED ---");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
