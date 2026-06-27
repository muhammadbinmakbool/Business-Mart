import { prisma } from "../../../lib/prisma.js";
import { IntakePricingResolver } from "./IntakePricingResolver.js";

// Basic assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running IntakePricingResolver Unit Tests ===");

  // Save original methods
  const originalFindFirst = prisma.intakeTransaction?.findFirst;
  const originalFindUnique = prisma.product?.findUnique;

  // Mock structures if they don't exist in early bootstrap
  if (!prisma.intakeTransaction) prisma.intakeTransaction = {};
  if (!prisma.product) prisma.product = {};

  try {
    // Test Case 1: Recent History Match (< 60 days)
    {
      prisma.intakeTransaction.findFirst = async () => ({
        rate: 145.50,
        rateUnit: "MAUND"
      });
      prisma.product.findUnique = async () => ({
        defaultBuyingRate: 120.00,
        buyingRateUnit: "KG",
        primaryUnit: "KG"
      });

      const res = await IntakePricingResolver.resolvePurchaseCost(1, 10);
      assert(res.rate === 145.50, "Should return recent supplier history rate");
      assert(res.rateUnit === "MAUND", "Should return recent supplier history rate unit");
      assert(res.prefillReason === "LAST_PURCHASE", "Should flag LAST_PURCHASE");
      console.log("✅ Test 1: Recent History Match passed");
    }

    // Test Case 2: Stale History Fallback (> 60 days)
    {
      prisma.intakeTransaction.findFirst = async () => null; // Simulates no history in last 60 days
      prisma.product.findUnique = async () => ({
        defaultBuyingRate: 120.00,
        buyingRateUnit: "KG",
        primaryUnit: "KG"
      });

      const res = await IntakePricingResolver.resolvePurchaseCost(1, 10);
      assert(res.rate === 120.00, "Should fall back to product catalog default rate");
      assert(res.rateUnit === "KG", "Should return product catalog unit");
      assert(res.prefillReason === "PRODUCT_DEFAULT", "Should flag PRODUCT_DEFAULT");
      console.log("✅ Test 2: Stale History Fallback passed");
    }

    // Test Case 3: Empty Fallback (No history, no default cost)
    {
      prisma.intakeTransaction.findFirst = async () => null;
      prisma.product.findUnique = async () => ({
        defaultBuyingRate: null,
        buyingRateUnit: "KG",
        primaryUnit: "KG"
      });

      const res = await IntakePricingResolver.resolvePurchaseCost(1, 10);
      assert(res.rate === null, "Should return null rate when no source is available");
      assert(res.rateUnit === "KG", "Should return product primaryUnit");
      assert(res.prefillReason === "NONE", "Should flag NONE");
      console.log("✅ Test 3: Empty Fallback passed");
    }

    // Test Case 4: Same Supplier, Different Product Isolation
    {
      let passedWhere = null;
      prisma.intakeTransaction.findFirst = async (args) => {
        passedWhere = args.where;
        return { rate: 100, rateUnit: "KG" };
      };

      await IntakePricingResolver.resolvePurchaseCost(99, 10);
      assert(passedWhere.productId === 99, "Query must filter by the requested productId");
      assert(passedWhere.partyId === 10, "Query must filter by the requested partyId");
      console.log("✅ Test 4: Same Supplier, Different Product isolation passed");
    }

    // Test Case 5: Different Supplier, Same Product Isolation
    {
      let passedWhere = null;
      prisma.intakeTransaction.findFirst = async (args) => {
        passedWhere = args.where;
        return { rate: 200, rateUnit: "KG" };
      };

      await IntakePricingResolver.resolvePurchaseCost(55, 88);
      assert(passedWhere.productId === 55, "Query must filter by the requested productId");
      assert(passedWhere.partyId === 88, "Query must filter by the requested partyId");
      console.log("✅ Test 5: Different Supplier, Same Product isolation passed");
    }

    console.log("=== All Tests Passed Successfully ===");
  } catch (err) {
    console.error("❌ Test Suite Failed:", err);
    process.exit(1);
  } finally {
    // Restore original methods
    prisma.intakeTransaction.findFirst = originalFindFirst;
    prisma.product.findUnique = originalFindUnique;
  }
}

// Run if called directly
runTests();
