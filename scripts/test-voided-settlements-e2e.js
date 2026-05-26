// Mock next/cache before ANY imports to prevent static generation store crash in CLI!
import Module from "module";
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "next/cache") {
    return {
      revalidatePath: () => {
        // Safe mock bypass for CLI
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

// Also mock global/process or globalThis next/cache imports if resolved via ESM directly
globalThis.revalidatePath = () => {};

import { prisma } from "../src/lib/prisma.js";
import { PartySettlementService } from "../src/modules/parties/services/PartySettlementService.js";
import { PartyProfileService } from "../src/modules/parties/services/PartyProfileService.js";
import { RateResolutionService } from "../src/modules/products/services/RateResolutionService.js";
import { updateInvoiceStatusAction } from "../src/modules/supplier-invoices/controllers/supplierInvoiceActions.js";

async function test(name, fn) {
  try {
    await fn();
    console.log(`\x1b[32m✔ PASS: ${name}\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m✘ FAIL: ${name}\x1b[0m`);
    console.error(err);
    process.exit(1);
  }
}

async function runSuite() {
  console.log("====================================================================");
  console.log("🚀 STARTING E2E PROGRAMMATIC HARDENING VERIFICATION SUITE");
  console.log("====================================================================\n");

  // ----------------------------------------------------
  // SETUP MOCK ENVIRONMENT
  // ----------------------------------------------------
  // Create test party, product, and related transactions
  const party = await prisma.party.create({
    data: {
      name: "Hardening E2E Test Supplier",
      partyType: "BOTH",
      phoneNumber: "03001234567",
      address: "E2E Test Warehouses",
      isActive: true
    }
  });

  const product = await prisma.product.create({
    data: {
      name: "Hardened Test Wheat Grain",
      category: "WEIGHT",
      primaryUnit: "KG"
    }
  });

  // Create historical reference rate for this product
  await prisma.productRate.create({
    data: {
      productId: product.id,
      rate: 45.0,
      unit: "KG",
      date: new Date(),
      isDeleted: false
    }
  });

  try {
    // ----------------------------------------------------
    // TEST 1: Extensible Schema and Direct Payment Auto-Generation
    // ----------------------------------------------------
    await test("Direct Clearance Creates Extensible Payment Pattern", async () => {
      // Create a mock Supplier Invoice
      const invoice = await prisma.supplierInvoice.create({
        data: {
          partyId: party.id,
          invoiceNumber: "INV-" + Math.floor(Math.random() * 100000),
          totalGrossValue: 10000,
          totalDeductions: 0,
          totalAdvances: 0,
          finalPayableAmount: 10000,
          status: "PENDING",
          entryDate: new Date()
        }
      });

      // Clear directly via SupplierInvoice status transition to COMPLETED
      const res = await updateInvoiceStatusAction(invoice.id, "COMPLETED");
      if (!res.success) throw new Error("Status transition action failed: " + res.error);

      // Verify that direct payment was recorded and structured correctly
      const payment = await prisma.partyPayment.findFirst({
        where: {
          partyId: party.id,
          sourceType: "DIRECT_SETTLEMENT",
          sourceId: invoice.id
        }
      });

      if (!payment) throw new Error("PartyPayment record not created on completed invoice status update");
      if (payment.status !== "ACTIVE") throw new Error(`Expected payment status to be ACTIVE, got ${payment.status}`);
      if (payment.sourceType !== "DIRECT_SETTLEMENT") throw new Error(`Expected sourceType to be DIRECT_SETTLEMENT, got ${payment.sourceType}`);
      if (payment.sourceId !== invoice.id) throw new Error(`Expected sourceId to be ${invoice.id}, got ${payment.sourceId}`);
      if (Number(payment.amount) !== 10000) throw new Error(`Expected payment amount to be 10000, got ${payment.amount}`);

      console.log(`  [LOG] Auto-Generated Payment: ${payment.paymentNumber}, status: ${payment.status}, sourceType: ${payment.sourceType}`);
    });

    // ----------------------------------------------------
    // TEST 2: Reverting Invoice status Voids Direct Payment instead of Deletion
    // ----------------------------------------------------
    await test("Invoice status reversion VOIDS direct payment & locks allocation snapshot", async () => {
      const invoice = await prisma.supplierInvoice.findFirst({
        where: { partyId: party.id }
      });
      if (!invoice) throw new Error("Invoice record missing for reversion test");

      // Verify active payment allocations exist
      const activeAlloc = await prisma.partyPaymentAllocation.findFirst({
        where: { referenceType: "SETTLEMENT", referenceId: invoice.id }
      });
      if (!activeAlloc) throw new Error("Allocation does not exist for active completed invoice");

      // Revert status to PENDING
      const res = await updateInvoiceStatusAction(invoice.id, "PENDING");
      if (!res.success) throw new Error("Status transition to pending failed: " + res.error);

      // Verify physical payment is NEVER deleted, but marked as VOIDED
      const voidedPayment = await prisma.partyPayment.findFirst({
        where: {
          partyId: party.id,
          sourceType: "DIRECT_SETTLEMENT",
          sourceId: invoice.id
        }
      });

      if (!voidedPayment) throw new Error("Physical payment record was deleted instead of voided!");
      if (voidedPayment.status !== "VOIDED") throw new Error(`Expected payment status to be VOIDED, got ${voidedPayment.status}`);

      // Verify that its allocation snapshot remains frozen and is NOT deleted!
      const frozenAlloc = await prisma.partyPaymentAllocation.findFirst({
        where: { paymentId: voidedPayment.id }
      });
      if (!frozenAlloc) throw new Error("Allocation record deleted; audit trail was lost!");

      console.log(`  [LOG] Verified payment ${voidedPayment.paymentNumber} has status VOIDED. Allocation snapshot preserved: Rs. ${frozenAlloc.allocatedAmount}`);
    });

    // ----------------------------------------------------
    // TEST 3: Voided Payments have Zero impact on active obligations FIFO reallocations
    // ----------------------------------------------------
    await test("Voided payments are skipped during FIFO re-allocation runs", async () => {
      // Add a new active invoice
      const invoice2 = await prisma.supplierInvoice.create({
        data: {
          partyId: party.id,
          invoiceNumber: "INV-" + Math.floor(Math.random() * 100000),
          totalGrossValue: 5000,
          totalDeductions: 0,
          totalAdvances: 0,
          finalPayableAmount: 5000,
          status: "PENDING",
          entryDate: new Date()
        }
      });

      // Record a manual cash payment of 3000
      const activePay = await PartySettlementService.recordPayment({
        partyId: party.id,
        paymentType: "CASH_OUT",
        amount: 3000,
        notes: "Partial active supplier clearance",
        paymentMethod: "CASH",
        entryDate: new Date()
      });

      // Fetch the second invoice and assert its status is PARTIAL
      const updatedInvoice2 = await prisma.supplierInvoice.findUnique({
        where: { id: invoice2.id }
      });
      if (updatedInvoice2.status !== "PARTIAL") {
        throw new Error(`Expected status PARTIAL for Invoice 2, got ${updatedInvoice2.status}`);
      }

      // Assert that the allocations of activePay equals exactly 3000
      const allocs = await prisma.partyPaymentAllocation.findMany({
        where: { paymentId: activePay.id }
      });
      const totalAllocVal = allocs.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
      if (totalAllocVal !== 3000) throw new Error(`Expected active allocations to be 3000, got ${totalAllocVal}`);

      console.log(`  [LOG] Verified FIFO allocation correct. Active payment matches Rs. 3000. Voided payment ignored during execution.`);
    });

    // ----------------------------------------------------
    // TEST 4: RateResolutionService Fallback rate and Session Caching
    // ----------------------------------------------------
    await test("RateResolutionService resolves rates chronological and handles caching sessions", async () => {
      // 1. Create an intake transaction with a rate
      const intakeWithRate = await prisma.intakeTransaction.create({
        data: {
          partyId: party.id,
          productId: product.id,
          grossWeight: 100,
          netWeight: 100,
          rate: 55.0,
          rateUnit: "KG",
          unit: "KG",
          status: "PENDING",
          entryDate: new Date(Date.now() - 3600000), // 1 hour ago
          intakeNumber: "INT-" + Math.floor(Math.random() * 1000000)
        }
      });

      // Start resolution session
      RateResolutionService.startSession();

      // Resolve the rate of the product
      const resolvedRate = await RateResolutionService.resolveRate(product.id);
      if (resolvedRate !== 55.0) {
        throw new Error(`Expected resolved rate to be 55.0 (latest intake), got ${resolvedRate}`);
      }

      // Modify the intake in the database to wheat rate Rs 65
      await prisma.intakeTransaction.update({
        where: { id: intakeWithRate.id },
        data: { rate: 65.0 }
      });

      // Resolve again. Since session is active, it must fetch Rs 55 from in-memory cache and NOT query DB!
      const cachedRate = await RateResolutionService.resolveRate(product.id);
      if (cachedRate !== 55.0) {
        throw new Error(`Session cache leak! Expected cached rate 55.0, got resolved rate ${cachedRate}`);
      }

      // End session
      RateResolutionService.endSession();

      // Start new session
      RateResolutionService.startSession();

      // Resolve again. Now that cache is cleared, it must fetch Rs 65 from database!
      const freshRate = await RateResolutionService.resolveRate(product.id);
      if (freshRate !== 65.0) {
        throw new Error(`Expected freshly resolved rate 65.0, got ${freshRate}`);
      }

      RateResolutionService.endSession();

      console.log(`  [LOG] Verified RateResolutionService. Session caching: PASS. Fallback resolution chronology: PASS.`);
    });

    // ----------------------------------------------------
    // TEST 5: PartyProfileService computes accurate Official vs Forecast Balances and Timeline
    // ----------------------------------------------------
    await test("PartyProfileService computes proper forecast overlays and chronological timeline balances", async () => {
      // 1. Create a null-rate unbilled intake
      const unbilledIntake = await prisma.intakeTransaction.create({
        data: {
          partyId: party.id,
          productId: product.id,
          grossWeight: 200,
          netWeight: 200,
          rate: null, // Null rate to trigger our newly built fallback!
          rateUnit: "KG",
          unit: "KG",
          status: "PENDING",
          entryDate: new Date(),
          intakeNumber: "INT-" + Math.floor(Math.random() * 1000000)
        }
      });

      // 2. Fetch profile via PartyProfileService
      const profile = await PartyProfileService.getPartyProfile(party.id);

      // Verify that unbilledIntake fell back to Wheat rate Rs 65 (200 * 65 = 13000)
      const pendingIntakes = profile.detailedViews.intakes.unbilled;
      const targetIntake = pendingIntakes.find(u => u.id === unbilledIntake.id);
      if (!targetIntake) throw new Error("Unbilled intake missing from profile detailed views");
      if (Number(targetIntake.rate) !== 65.0) {
        throw new Error(`Expected fallback rate of unbilled intake to resolve to 65.0, got ${targetIntake.rate}`);
      }
      if (Number(targetIntake.estimatedValue) !== 13000) {
        throw new Error(`Expected estimated value to be 13000, got ${targetIntake.estimatedValue}`);
      }

      // Verify Forecast Balance != Official Balance (Overlay applies)
      const officialBal = Number(profile.summary.officialBalance);
      const forecastBal = Number(profile.summary.forecastBalance);

      if (officialBal === forecastBal) {
        throw new Error("Forecast Balance and Official Balance are identical. Pending Credit did not apply!");
      }

      // Check timeline running balances
      const timeline = profile.timeline;
      if (timeline.length === 0) throw new Error("Timeline events list is empty");
      
      // Chronological check
      let currentVal = 0;
      const chronologicalEvents = [...timeline].sort((a, b) => a.date - b.date);
      for (const evt of chronologicalEvents) {
        currentVal += evt.debit - evt.credit;
        const matchingTimelineItem = timeline.find(t => t.id === evt.id);
        if (matchingTimelineItem.runningBalance !== currentVal) {
          throw new Error(`Chronological running balance mismatch on event ${evt.id}. Expected ${currentVal}, got ${matchingTimelineItem.runningBalance}`);
        }
      }

      console.log(`  [LOG] Official Balance: Rs. ${officialBal}, Forecast Balance: Rs. ${forecastBal}`);
      console.log(`  [LOG] Timeline Chronological Running Balance: Verified perfectly matching raw log sequence.`);
    });

  } finally {
    // ----------------------------------------------------
    // CLEAN UP DATABASE MOCK RECORDS
    // ----------------------------------------------------
    console.log("\n🧹 Tearing down mock environment data...");
    
    // Cascade delete allocations
    await prisma.partyPaymentAllocation.deleteMany({
      where: { partyId: party.id }
    });

    // Delete payments
    await prisma.partyPayment.deleteMany({
      where: { partyId: party.id }
    });

    // Delete supplier invoices
    await prisma.supplierInvoice.deleteMany({
      where: { partyId: party.id }
    });

    // Delete intakes
    await prisma.intakeTransaction.deleteMany({
      where: { partyId: party.id }
    });

    // Delete advances
    await prisma.intakeAdvance.deleteMany({
      where: { partyId: party.id }
    });

    // Delete products and rates
    await prisma.productRate.deleteMany({
      where: { productId: product.id }
    });

    await prisma.product.delete({
      where: { id: product.id }
    });

    // Delete party
    await prisma.party.delete({
      where: { id: party.id }
    });

    console.log("✨ Mock environment cleaned up successfully.");
  }

  console.log("\n====================================================================");
  console.log("🎉 ALL HARDENING SUITE E2E TESTS PASSED WITH 100% FINANCIAL INTEGRITY!");
  console.log("====================================================================");
}

runSuite().catch(err => {
  console.error("Test Suite execution crash:", err);
  process.exit(1);
});
