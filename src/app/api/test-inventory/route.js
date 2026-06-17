import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InventoryService } from "@/modules/products/services/InventoryService";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import { SaleService } from "@/modules/sales/services/SaleService";
import { UnitService } from "@/modules/products/services/UnitService";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = [];
  const results = [];

  function log(message) {
    console.log(`[Inventory Test] ${message}`);
    logs.push(message);
  }

  function assertEqual(actual, expected, message) {
    const act = Number(actual);
    const exp = Number(expected);
    const passed = Math.abs(act - exp) < 0.001;
    if (passed) {
      log(`✅ PASS: ${message} (Value: ${act})`);
      results.push({ description: message, passed: true, details: `Got ${act}, expected ${exp}` });
    } else {
      log(`❌ FAIL: ${message} (Expected ${exp}, got ${act})`);
      results.push({ description: message, passed: false, details: `Got ${act}, expected ${exp}` });
    }
  }

  async function getStock(productId) {
    const p = await prisma.product.findUnique({ where: { id: productId } });
    return p ? Number(p.quantity) : 0;
  }

  try {
    log("Starting Inventory Evolution Phase D Integration Tests...");

    // 0. Cleanup any previous test data
    log("Cleaning up old test data...");
    await prisma.salesTrack.deleteMany({
      where: {
        OR: [
          { product: { name: { startsWith: "_TEST_" } } },
          { supplier: { name: { startsWith: "_TEST_" } } },
          { buyer: { name: { startsWith: "_TEST_" } } }
        ]
      }
    });

    await prisma.intakeAdvance.deleteMany({
      where: {
        intakeTransaction: {
          product: { name: { startsWith: "_TEST_" } }
        }
      }
    });

    await prisma.intakeTransaction.deleteMany({
      where: {
        product: { name: { startsWith: "_TEST_" } }
      }
    });

    await prisma.saleItem.deleteMany({
      where: {
        product: { name: { startsWith: "_TEST_" } }
      }
    });

    await prisma.saleTransaction.deleteMany({
      where: {
        notes: { startsWith: "[Test Sale]" }
      }
    });

    await prisma.initialStock.deleteMany({
      where: {
        product: { name: { startsWith: "_TEST_" } }
      }
    });

    await prisma.product.deleteMany({
      where: { name: { startsWith: "_TEST_" } }
    });

    await prisma.party.deleteMany({
      where: { name: { startsWith: "_TEST_" } }
    });

    // Create Test Supplier & Buyer
    const supplier = await prisma.party.create({
      data: { name: "_TEST_Supplier", partyType: "SUPPLIER", phoneNumber: "0000000000" }
    });
    const buyer = await prisma.party.create({
      data: { name: "_TEST_Buyer", partyType: "BUYER", phoneNumber: "1111111111" }
    });

    log(`Created test parties. Supplier ID: ${supplier.id}, Buyer ID: ${buyer.id}`);

    // ==========================================
    // SCENARIO 1: Direct POS Sale (with InitialStock)
    // ==========================================
    log("\n--- Scenario 1: Direct POS Sale & InitialStock ---");
    const productA = await prisma.product.create({
      data: { name: "_TEST_ProductA", category: "WEIGHT", primaryUnit: "KG", quantity: 0 }
    });
    
    // Add Initial Stock
    await prisma.initialStock.create({
      data: { productId: productA.id, quantity: 100, unit: "KG", notes: "Initial onboarding stock" }
    });
    await InventoryService.recalculateProductStock(productA.id);
    let stockA = await getStock(productA.id);
    assertEqual(stockA, 100, "InitialStock added correctly");

    // Record direct sale
    const sale1 = await SaleService.recordSale({
      partyId: buyer.id,
      entryDate: new Date(),
      notes: "[Test Sale] Scenario 1 Direct POS",
      items: [
        { productId: productA.id, weight: 40, unit: "KG", rate: 50, amount: 2000 }
      ]
    });
    await InventoryService.recalculateProductStock(productA.id);
    stockA = await getStock(productA.id);
    assertEqual(stockA, 60, "Direct POS sale decrements available stock");

    // ==========================================
    // SCENARIO 2: Intake-Linked Sale (Flow A vs Flow B)
    // ==========================================
    log("\n--- Scenario 2: Intake-Linked Sale & Flow Separation ---");
    const productB = await prisma.product.create({
      data: { name: "_TEST_ProductB", category: "WEIGHT", primaryUnit: "KG", quantity: 0 }
    });

    // Create Intake (adds stock)
    const intakeB = await IntakeService.createIntake({
      partyId: supplier.id,
      productId: productB.id,
      bagCount: 10,
      grossWeight: 100,
      unit: "KG",
      entryDate: new Date(),
      status: "PENDING"
    });
    await InventoryService.recalculateProductStock(productB.id);
    let stockB = await getStock(productB.id);
    assertEqual(stockB, 100, "Intake creation increases stock");

    // Sell intake (creates SalesTrack & updates Intake status to SOLD)
    await IntakeService.sellIntake(intakeB.id, {
      buyerPartyId: buyer.id,
      netWeight: 40,
      rate: 80,
      rateUnit: "KG",
      Bardana: 0,
      Khot: 0,
      status: "SOLD"
    });
    
    // Verify that available stock did NOT decrease yet (separation of Flow A and Flow B)
    await InventoryService.recalculateProductStock(productB.id);
    stockB = await getStock(productB.id);
    assertEqual(stockB, 100, "sellIntake does NOT reduce stock (Flow B operational only)");

    // Retrieve the SalesTrack
    const trackB = await prisma.salesTrack.findFirst({
      where: { intakeTransactionId: intakeB.id }
    });
    
    // Finalize the Sale linking to the track
    const sale2 = await SaleService.recordSale({
      partyId: buyer.id,
      entryDate: new Date(),
      notes: "[Test Sale] Scenario 2 Intake-Linked",
      items: [
        { productId: productB.id, weight: 40, unit: "KG", rate: 80, amount: 3200, salesTrackId: trackB.id }
      ]
    });
    await InventoryService.recalculateProductStock(productB.id);
    stockB = await getStock(productB.id);
    assertEqual(stockB, 60, "Finalizing intake-linked sale decrements stock");

    // ==========================================
    // SCENARIO 3: Mixed Basket
    // ==========================================
    log("\n--- Scenario 3: Mixed Basket Sale (POS + Intake-Linked) ---");
    // Product A has 60 KG left (initial 100 - sale1 40)
    // Product B has 60 KG left (intake 100 - sale2 40)

    // Let's create another intake for Product B and sell it operationally to get a track
    const intakeB2 = await IntakeService.createIntake({
      partyId: supplier.id,
      productId: productB.id,
      bagCount: 5,
      grossWeight: 50,
      unit: "KG",
      entryDate: new Date(),
      status: "PENDING"
    });
    await InventoryService.recalculateProductStock(productB.id);
    stockB = await getStock(productB.id);
    assertEqual(stockB, 110, "Second intake increases product B stock to 110");

    await IntakeService.sellIntake(intakeB2.id, {
      buyerPartyId: buyer.id,
      netWeight: 20,
      rate: 80,
      rateUnit: "KG",
      Bardana: 0,
      Khot: 0,
      status: "SOLD"
    });
    const trackB2 = await prisma.salesTrack.findFirst({
      where: { intakeTransactionId: intakeB2.id }
    });

    // Create mixed basket sale: Product A (Direct POS 30 KG) + Product B (Linked 20 KG)
    const sale3 = await SaleService.recordSale({
      partyId: buyer.id,
      entryDate: new Date(),
      notes: "[Test Sale] Scenario 3 Mixed Basket",
      items: [
        { productId: productA.id, weight: 30, unit: "KG", rate: 50, amount: 1500 },
        { productId: productB.id, weight: 20, unit: "KG", rate: 80, amount: 1600, salesTrackId: trackB2.id }
      ]
    });

    await InventoryService.recalculateProductStock(productA.id);
    await InventoryService.recalculateProductStock(productB.id);
    stockA = await getStock(productA.id);
    stockB = await getStock(productB.id);

    assertEqual(stockA, 30, "Mixed sale correctly decrements Product A (POS) stock");
    assertEqual(stockB, 90, "Mixed sale correctly decrements Product B (Linked) stock");

    // ==========================================
    // SCENARIO 4: Partial Intake Selling
    // ==========================================
    log("\n--- Scenario 4: Partial Intake Selling ---");
    const productC = await prisma.product.create({
      data: { name: "_TEST_ProductC", category: "WEIGHT", primaryUnit: "KG", quantity: 0 }
    });

    // Create 200 KG intake
    const intakeC = await IntakeService.createIntake({
      partyId: supplier.id,
      productId: productC.id,
      bagCount: 20,
      grossWeight: 200,
      unit: "KG",
      entryDate: new Date(),
      status: "PENDING"
    });
    await InventoryService.recalculateProductStock(productC.id);
    let stockC = await getStock(productC.id);
    assertEqual(stockC, 200, "Intake C created with 200 KG");

    // Sell 50 KG (remaining: 150 KG)
    await IntakeService.sellIntake(intakeC.id, {
      buyerPartyId: buyer.id,
      netWeight: 50,
      rate: 100,
      rateUnit: "KG",
      Bardana: 0,
      Khot: 0,
      isPartialSale: true,
      soldQuantity: 50
    });
    let trackC1 = await prisma.salesTrack.findFirst({
      where: { intakeTransactionId: intakeC.id, isBilled: false }
    });

    // Sell another 80 KG (remaining: 70 KG)
    await IntakeService.sellIntake(intakeC.id, {
      buyerPartyId: buyer.id,
      netWeight: 80,
      rate: 100,
      rateUnit: "KG",
      Bardana: 0,
      Khot: 0,
      isPartialSale: true,
      soldQuantity: 80
    });
    let trackC2 = await prisma.salesTrack.findFirst({
      where: { intakeTransactionId: intakeC.id, id: { not: trackC1.id } }
    });

    // Available stock must still be 200 KG
    await InventoryService.recalculateProductStock(productC.id);
    stockC = await getStock(productC.id);
    assertEqual(stockC, 200, "Stock is still 200 KG after partial sells (Flow B)");

    // Record sale for 50 KG
    const sale4a = await SaleService.recordSale({
      partyId: buyer.id,
      entryDate: new Date(),
      notes: "[Test Sale] Scenario 4 Partial 50KG",
      items: [
        { productId: productC.id, weight: 50, unit: "KG", rate: 100, amount: 5000, salesTrackId: trackC1.id }
      ]
    });
    await InventoryService.recalculateProductStock(productC.id);
    stockC = await getStock(productC.id);
    assertEqual(stockC, 150, "Stock is 150 KG after first partial sale finalized");

    // Record sale for 80 KG
    const sale4b = await SaleService.recordSale({
      partyId: buyer.id,
      entryDate: new Date(),
      notes: "[Test Sale] Scenario 4 Partial 80KG",
      items: [
        { productId: productC.id, weight: 80, unit: "KG", rate: 100, amount: 8000, salesTrackId: trackC2.id }
      ]
    });
    await InventoryService.recalculateProductStock(productC.id);
    stockC = await getStock(productC.id);
    assertEqual(stockC, 70, "Stock is 70 KG after second partial sale finalized");

    // ==========================================
    // SCENARIO 5: Cancellation / Deletion (Revert Stock)
    // ==========================================
    log("\n--- Scenario 5: Cancellation & Deletion (Restoring Stock) ---");
    // Cancel first sale (50 KG)
    await SaleService.updateStatus(sale4a.id, "CANCELLED", "Integration Test Cancel");
    await InventoryService.recalculateProductStock(productC.id);
    stockC = await getStock(productC.id);
    assertEqual(stockC, 120, "Cancelling sale restores 50 KG stock (stock goes to 120)");

    // Soft delete second sale (80 KG)
    await SaleService.deleteSale(sale4b.id, "Integration Test Delete");
    await InventoryService.recalculateProductStock(productC.id);
    stockC = await getStock(productC.id);
    assertEqual(stockC, 200, "Deleting sale restores 80 KG stock (stock goes to 200)");

    // ==========================================
    // SCENARIO 6: Soft-Delete Intake Integrity
    // ==========================================
    log("\n--- Scenario 6: Soft-Delete Intake Integrity ---");
    // Create new intake of 50 KG
    const intakeC2 = await IntakeService.createIntake({
      partyId: supplier.id,
      productId: productC.id,
      bagCount: 5,
      grossWeight: 50,
      unit: "KG",
      entryDate: new Date(),
      status: "PENDING"
    });
    await InventoryService.recalculateProductStock(productC.id);
    stockC = await getStock(productC.id);
    assertEqual(stockC, 250, "New intake increases Product C stock to 250");

    // Soft-delete the new intake
    await IntakeService.deleteIntake(intakeC2.id, "Integration Test Delete");
    await InventoryService.recalculateProductStock(productC.id);
    stockC = await getStock(productC.id);
    assertEqual(stockC, 200, "Soft-deleted intake is excluded from stock (stock goes back to 200)");

    // ==========================================
    // SCENARIO 7: Unit Normalization
    // ==========================================
    log("\n--- Scenario 7: Unit Normalization (Maund to KG) ---");
    const productD = await prisma.product.create({
      data: { name: "_TEST_ProductD", category: "WEIGHT", primaryUnit: "KG", quantity: 0 }
    });

    // Create Intake of 2 Maunds (1 Maund = 40 KG, so 2 Maunds = 80 KG)
    const intakeD = await IntakeService.createIntake({
      partyId: supplier.id,
      productId: productD.id,
      bagCount: 2,
      grossWeight: 2,
      unit: "MAUND",
      entryDate: new Date(),
      status: "PENDING"
    });
    await InventoryService.recalculateProductStock(productD.id);
    let stockD = await getStock(productD.id);
    assertEqual(stockD, 80, "Intake of 2 Maunds normalized to 80 KG stock");

    // Record sale of 1 Maund (40 KG)
    const saleD = await SaleService.recordSale({
      partyId: buyer.id,
      entryDate: new Date(),
      notes: "[Test Sale] Scenario 7 Unit Normalization",
      items: [
        { productId: productD.id, weight: 1, unit: "MAUND", rate: 2000, amount: 2000 }
      ]
    });
    await InventoryService.recalculateProductStock(productD.id);
    stockD = await getStock(productD.id);
    assertEqual(stockD, 40, "Sale of 1 Maund decrements stock by 40 KG (remaining stock 40 KG)");

    log("\nAll integration test scenarios completed.");
  } catch (error) {
    log(`❌ FATAL ERROR DURING TESTS: ${error.message}`);
    console.error(error);
  }

  const allPassed = results.every(r => r.passed);
  return NextResponse.json({
    success: allPassed,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    },
    results,
    logs
  });
}
