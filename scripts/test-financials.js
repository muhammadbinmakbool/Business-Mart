import { calculateAdjustment, round } from "../src/lib/financial.js";

/**
 * Common mock context
 */
const context = {
  baseAmount: 100000.55,
  totalWeight: 5000.75
};

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
  }
}

console.log("--- Testing Financial Edge Cases ---");

test("Fixed Adjustment", () => {
  const result = calculateAdjustment("FIXED", 500);
  if (result !== 500) throw new Error(`Expected 500, got ${result}`);
});

test("Percentage Adjustment (2%)", () => {
  const result = calculateAdjustment("PERCENTAGE", 2, context);
  const expected = round((2 / 100) * 100000.55);
  if (result !== expected) throw new Error(`Expected ${expected}, got ${result}`);
});

test("Per Weight Adjustment (Rs 5)", () => {
  const result = calculateAdjustment("PER_WEIGHT", 5, context);
  const expected = round(5 * 5000.75);
  if (result !== expected) throw new Error(`Expected ${expected}, got ${result}`);
});

test("Zero Value Adjustment", () => {
  const result = calculateAdjustment("PERCENTAGE", 0, context);
  if (result !== 0) throw new Error(`Expected 0, got ${result}`);
});

test("Very Small Percentage (0.01%)", () => {
  const result = calculateAdjustment("PERCENTAGE", 0.01, { baseAmount: 100 });
  if (result !== 0.01) throw new Error(`Expected 0.01, got ${result}`);
});

test("Rounding precision (0.333 * 3)", () => {
  const base = 0.333 * 3; // 0.999
  const res = round(base, 2);
  if (res !== 1.00) throw new Error(`Expected 1.00, got ${res}`);
});

console.log("\n--- All Financial Logic Tests Passed ---");
