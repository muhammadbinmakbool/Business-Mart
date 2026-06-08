import { prisma } from "../src/lib/prisma.js";
import { PartyInvoiceClearingService } from "../src/modules/party-ledger/services/PartyInvoiceClearingService.js";
import { PartyProfileService } from "../src/modules/parties/services/PartyProfileService.js";

async function runTest() {
  console.log("====================================================================");
  console.log("🚀 STARTING SIMPLIFIED FIFO CLEARING VERIFICATION SUITE");
  console.log("====================================================================");

  // 1. Setup mock environment
  console.log("Setting up mock buyer party...");
  const mockParty = await prisma.party.create({
    data: {
      name: "Test Shopkeeper Buyer",
      partyType: "BUYER",
      phoneNumber: "03001234567",
      isActive: true
    }
  });
  console.log(`Mock buyer created with ID: ${mockParty.id}`);

  // Create two unpaid buyer invoices
  console.log("Creating unpaid SaleTransactions...");
  const sale1 = await prisma.saleTransaction.create({
    data: {
      saleNumber: `SALE-TEST-999A`,
      partyId: mockParty.id,
      entryDate: new Date("2026-05-01T10:00:00Z"), // Oldest
      totalWeight: 100,
      baseAmount: 10000,
      totalAdjustments: 0,
      finalAmount: 10000,
      status: "PENDING",
      paymentStatus: "PENDING"
    }
  });

  const sale2 = await prisma.saleTransaction.create({
    data: {
      saleNumber: `SALE-TEST-999B`,
      partyId: mockParty.id,
      entryDate: new Date("2026-05-02T10:00:00Z"), // Newer
      totalWeight: 50,
      baseAmount: 5000,
      totalAdjustments: 0,
      finalAmount: 5000,
      status: "PENDING",
      paymentStatus: "PENDING"
    }
  });

  console.log(`Sale 1: ${sale1.saleNumber} (Rs. 10,000)`);
  console.log(`Sale 2: ${sale2.saleNumber} (Rs. 5,000)`);

  // 2. Execute FIFO Clearance
  console.log("\nApplying a quick payment of Rs. 12,000...");
  const result = await PartyInvoiceClearingService.applyPayment(mockParty.id, 12000, "CASH_IN");
  
  console.log(`FIFO allocations summary:`);
  console.log(JSON.stringify(result, null, 2));

  // 3. Assertions
  const updatedSale1 = await prisma.saleTransaction.findUnique({ where: { id: sale1.id } });
  const updatedSale2 = await prisma.saleTransaction.findUnique({ where: { id: sale2.id } });

  console.log("\nAsserting database state...");
  
  if (Number(updatedSale1.paidAmount) !== 10000 || updatedSale1.paymentStatus !== "CLEARED" || updatedSale1.status !== "CLEARED") {
    throw new Error(`Sale 1 FIFO failed! Expected Rs. 10000, CLEARED, status CLEARED. Got Rs. ${updatedSale1.paidAmount}, ${updatedSale1.paymentStatus}, status ${updatedSale1.status}`);
  }
  console.log("✔ PASS: Sale 1 is CLEARED & status updated to CLEARED (Rs. 10,000 / 10,000 paid)");

  if (Number(updatedSale2.paidAmount) !== 2000 || updatedSale2.paymentStatus !== "PARTIAL" || updatedSale2.status !== "PENDING") {
    throw new Error(`Sale 2 FIFO failed! Expected Rs. 2000, PARTIAL, status PENDING. Got Rs. ${updatedSale2.paidAmount}, ${updatedSale2.paymentStatus}, status ${updatedSale2.status}`);
  }
  console.log("✔ PASS: Sale 2 is PARTIAL & status remains PENDING (Rs. 2,000 / 5,000 paid)");

  if (Number(result.unallocatedAmount) !== 0) {
    throw new Error(`Unallocated excess failed! Expected Rs. 0. Got Rs. ${result.unallocatedAmount}`);
  }
  console.log("✔ PASS: Unallocated excess is Rs. 0");

  // 4. Assert PartyProfileService simple calculations
  console.log("\nVerifying PartyProfileService summary calculations...");
  const profile = await PartyProfileService.getPartyProfile(mockParty.id);
  
  console.log(`Total Sales Debt Remaining: Rs. ${profile.summary.totalSalesRemaining}`);
  console.log(`Official Net Balance: Rs. ${profile.summary.officialBalance}`);

  if (profile.summary.totalSalesRemaining !== 3000) {
    throw new Error(`Profile summary calculation failed! Expected remaining debt Rs. 3000. Got Rs. ${profile.summary.totalSalesRemaining}`);
  }
  console.log("✔ PASS: PartyProfileService correctly reflects Rs. 3,000 outstanding debt");

  // 5. Cleanup
  console.log("\nCleaning up mock data...");
  await prisma.saleTransaction.deleteMany({ where: { partyId: mockParty.id } });
  await prisma.party.delete({ where: { id: mockParty.id } });
  console.log("Mock data purged successfully.");

  console.log("====================================================================");
  console.log("🎉 ALL SIMPLIFIED FIFO CLEARING TESTS PASSED WITH 100% SUCCESS!");
  console.log("====================================================================");
}

runTest().catch(err => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
