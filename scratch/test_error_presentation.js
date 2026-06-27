import { getErrorPresentation } from "../src/lib/errors/errorPresentation.js";
import assert from "assert";

console.log("=== Testing getErrorPresentation Zod parsing ===");

// 1. Zod error JSON string format
const rawZodError = JSON.stringify([
  { origin: "number", code: "too_small", minimum: 1, inclusive: true, path: ["partyId"], message: "Supplier is required" }
]);

const result1 = getErrorPresentation({ error: rawZodError });
assert.strictEqual(result1.title, "Input Validation Error");
assert.strictEqual(result1.code, "VALIDATION_ERROR");
assert.strictEqual(result1.message, "• Supplier is required");
assert.strictEqual(result1.type, "warning");
console.log("✅ Test 1: Single Zod error formatted successfully");

// 2. Multiple Zod errors
const rawZodErrors = JSON.stringify([
  { path: ["partyId"], message: "Supplier is required" },
  { path: ["productId"], message: "Product is required" }
]);

const result2 = getErrorPresentation({ error: rawZodErrors });
assert.strictEqual(result2.title, "Input Validation Error");
assert.strictEqual(result2.code, "VALIDATION_ERROR");
assert.strictEqual(result2.message, "• Supplier is required\n• Product is required");
assert.strictEqual(result2.type, "warning");
console.log("✅ Test 2: Multiple Zod errors formatted successfully");

// 3. Non-JSON standard message fallback
const standardError = { error: "Something else failed" };
const result3 = getErrorPresentation(standardError);
assert.strictEqual(result3.title, "Unexpected Error Occurred");
assert.strictEqual(result3.code, "UNKNOWN_ERROR");
assert.strictEqual(result3.message, "Something else failed");
assert.strictEqual(result3.type, "error");
console.log("✅ Test 3: Standard non-Zod error behaves normally");

console.log("=== All error presentation tests passed! ===");
