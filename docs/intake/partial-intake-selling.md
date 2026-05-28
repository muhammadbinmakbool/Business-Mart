# Optional Partial Intake Selling — Developer Guide

This developer guide documents the architecture, database mutations, core state calculations, service layers, and frontend interfaces that govern the **Optional Partial Intake Selling** feature.

---

## 🎯 Design Philosophy & Core Objective

The system maintains a lightweight **intake-centric inventory model** without full ERP drift (no intake version chains, complex batch allocation engines, child splitting, or traceability tree hierarchy). 

Instead, it tracks the lifecycle of an intake using a simple **`remainingWeight`** field:
*   **Default Behavior**: An intake is sold fully in one step. Remaining weight becomes `0`, and status transitions to `SOLD`.
*   **Optional Partial Selling**: An operator can sell a custom quantity of an intake. The remaining weight decrements, the status transitions to `PARTIAL`, and a buyer `SalesTrack` (sales trace) is recorded for the sold portion. Subsequent partial sales consume the rest until remaining weight reaches `0` and status becomes `SOLD`.

---

## 📊 Database Schema Updates

The `IntakeTransaction` model in [schema.prisma](file:///d:/Projects/Next%20JS/prisma/schema.prisma) includes a nullable `remainingWeight` field to track consumption:

```prisma
model IntakeTransaction {
  id              Int                   @id @default(autoincrement())
  intakeNumber    String                @unique
  // ...
  grossWeight     Decimal               @db.Decimal(18, 2)
  remainingWeight Decimal?              @db.Decimal(18, 2) // <-- tracks active weight in inventory
  status          String                // PENDING, PARTIAL, SOLD, CLEARED, CANCELLED
  // ...
}
```

*   **Migration Path**: Existing records are fully backfilled so that `remainingWeight = grossWeight` for all `PENDING` intakes (and initialized to `0` or appropriate decimals for historical `SOLD` ones).

---

## ⚙️ Centralized State Engine (`financial.js`)

State transitions are governed by a single, unit-tested pure function inside [financial.js](file:///d:/Projects/Next%20JS/src/lib/financial.js):

```javascript
export function calculateIntakeState({ grossWeight, remainingWeight }) {
  const gross = Number(grossWeight || 0);
  const remaining = Number(remainingWeight || 0);

  if (remaining <= 0) {
    return INTAKE_STATUS.SOLD;
  }
  if (remaining < gross) {
    return INTAKE_STATUS.PARTIAL;
  }
  return INTAKE_STATUS.PENDING;
}
```

---

## 🔧 Core Services & Integration

### 1. Atomic Transaction Selling (`IntakeService.sellIntake`)
Selling is handled inside a Prisma database transaction in [IntakeService.js](file:///d:/Projects/Next%20JS/src/modules/intake/services/IntakeService.js):

*   **Validations**: Checks if the intake is already fully sold/cleared/cancelled and ensures `soldQuantity <= remainingWeight`.
*   **Calculations**:
    *   Subtracts the sold weight from `remainingWeight`.
    *   Calculates the new intake status using `calculateIntakeState`.
    *   Accumulates the sold portion net weight in the intake's `netWeight` field.
*   **Sales Tracking**: Creates a `SalesTrack` record for the sold portion linked to the buyer.
*   **Inventory Re-aggregation**: Triggers `InventoryService.recalculateProductStock` for the product.

```javascript
const newRemaining = Decimal.sub(currentRemaining, new Decimal(soldQuantity));
const nextStatus = calculateIntakeState({ 
  grossWeight: Number(current.grossWeight), 
  remainingWeight: Number(newRemaining) 
});

await tx.intakeTransaction.update({
  where: { id: intakeId },
  data: {
    status: nextStatus,
    remainingWeight: newRemaining,
    rate: rate,
    rateUnit: rateUnit,
    Bardana: Decimal.add(current.Bardana || 0, new Decimal(Bardana)),
    Khot: Decimal.add(current.Khot || 0, new Decimal(Khot)),
    netWeight: Decimal.add(current.netWeight || 0, new Decimal(netWeight))
  }
});
```

### 2. Live Inventory Stock Calculation (`InventoryService`)
The available product warehouse inventory is computed dynamically inside [InventoryService.js](file:///d:/Projects/Next%20JS/src/modules/products/services/InventoryService.js). Instead of just summing gross weights, it sums the **`remainingWeight`** of active intakes:

```javascript
const activeIntakes = await tx.intakeTransaction.findMany({
  where: {
    productId,
    status: { in: ["PENDING", "PARTIAL"] }
  }
});

let totalStockKg = new Decimal(0);
for (const intake of activeIntakes) {
  const weight = intake.remainingWeight !== null ? intake.remainingWeight : intake.grossWeight;
  const normalized = normalizeQuantity(Number(weight), intake.unit, product);
  totalStockKg = totalStockKg.plus(new Decimal(normalized));
}
```

---

## 🖥️ UI Implementations

### 1. Sell Modal Dialog (`StatusUpdateButtons.js`)
Located in [StatusUpdateButtons.js](file:///d:/Projects/Next%20JS/src/app/intake/[id]/StatusUpdateButtons.js):
*   Provides a **"Partial Sale"** checkbox.
*   Renders a slide-down input for **Sold Quantity** displaying the maximum remaining available weight.
*   Performs real-time deduction math (deducting tare and impurity deductions relative to the *active sold weight*).
*   Enforces double validation: client-side input block + server action check.

### 2. List Dashboard & Filters (`IntakeListClient.js`)
Located in [IntakeListClient.js](file:///d:/Projects/Next%20JS/src/app/intake/IntakeListClient.js):
*   Renders a distinct, custom **`PARTIAL`** status badge with high-contrast purple theme.
*   Groups partially sold intakes within the **"Sold"** tab counts and filter views to prevent cluttered dashboard navigation.

### 3. Supplier Settlement Picker (`InvoiceGenerator.js`)
Located in [InvoiceGenerator.js](file:///d:/Projects/Next%20JS/src/app/supplier-invoices/create/InvoiceGenerator.js):
*   Renders the uninvoiced selector showing both fully sold and partially sold intakes eligible for invoicing.
*   Renders **`PARTIAL`** status tags next to partial intakes.
*   Visually displays the ratio of remaining weight to gross weight (e.g., `500 (1,000 gross) KG`) for full clarity during clearing.

---

## 🧪 Developer Verification Checklist

### 1. High-Speed Default (Full Sale)
1. Mark a `PENDING` intake as sold without ticking "Partial Sale".
2. Verify remaining weight drops to `0` and status transitions to `SOLD`.
3. Verify total product stock decreases by the full intake weight.

### 2. Partial Sale Consumption
1. Open the "Sell" modal for a `PENDING` intake of `1000 KG`.
2. Select "Partial Sale" and input `300 KG`. Submit.
3. Verify status transitions to `PARTIAL`, remaining weight becomes `700 KG`, and product stock decreases by exactly `300 KG`.
4. Open the modal again. Verify that the max available weight input limits you to `700 KG`.
5. Enter `700 KG` (to sell the rest). Submit.
6. Verify status transitions to `SOLD` and remaining weight becomes `0`.

### 3. Over-Selling Prevention (Validation)
1. Trigger a manual server action or API call attempting to sell `1200 KG` of a `1000 KG` intake.
2. Verify the server rejects the request with an `INVALID_SOLD_QUANTITY` error.
