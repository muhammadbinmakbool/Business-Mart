# Sales Invoice Adjustments Developer Guide

This document describes the architectural layout, implementation details, and mathematical flow of **Billing Adjustments** in Sales Invoices (`SaleTransaction`). This guide serves as a technical reference for developers implementing similar adjustment mechanisms across other transaction flows (e.g., Supplier Invoices).

---

## 1. Architectural Role and Principles

Adjustments represent additional charges or deductions calculated and applied to the base product amount of an invoice. 

Key design principles include:
- **Centralized Math (Financial Boundary)**: All math calculations are implemented in `src/lib/financial.js`. Neither the UI nor the service layer contains custom math formulas.
- **Base Unit Calculations**: The financial engine operates strictly on normalized base-unit quantities (e.g., `KG`) to guarantee consistency and avoid rounding drift.
- **Immutable Snapshots**: Individual adjustment values (`value`) and their calculated currency amounts (`calculatedAmount`) are persisted as snapshots alongside the transaction for auditability and consistency.

---

## 2. File Structure and Components

The adjustment flow is implemented across several modules:

```
src/
├── app/
│   └── sales/
│       └── create/
│           └── SaleForm.js                 # UI layer: gathers input, displays live calculations
├── lib/
│   ├── constants.js                        # Configuration: allowed adjustment names
│   ├── financial.js                        # Math Engine: central calculation logic
│   └── prisma.js                           # Prisma Client instance
├── modules/
│   ├── sales/
│   │   ├── controllers/
│   │   │   └── saleActions.js              # Entrypoint: server actions (Next.js)
│   │   ├── repositories/
│   │   │   └── SaleRepository.js           # DB queries: includes adjustments in fetches
│   │   └── services/
│   │       └── SaleService.js              # Business logic: maps, validates, and triggers DB writes
│   └── shared/
│       └── validations/
│           └── adjustmentSchema.js         # Zod schemas: validates adjustments
```

---

## 3. Database Schema

Adjustments are stored in the `TransactionAdjustment` model. The schema relation dictates that each adjustment is owned by a single `SaleTransaction`.

```prisma
model SaleTransaction {
  id               Int                     @id @default(autoincrement())
  saleNumber       String                  @unique // SAL-XXXXXX
  totalWeight      Decimal                 @db.Decimal(18, 2) // Derived sum of items
  baseAmount       Decimal                 @db.Decimal(18, 2) // Derived sum of items (weight * rate)
  totalAdjustments Decimal                 @db.Decimal(18, 2) // Sum of all calculated adjustments
  finalAmount      Decimal                 @db.Decimal(18, 2) // baseAmount +/- totalAdjustments
  adjustments      TransactionAdjustment[]
  // ... other fields
}

model TransactionAdjustment {
  id               Int             @id @default(autoincrement())
  saleId           Int
  adjustmentType   String          // Commission, Labour, Rent, Kaat, etc.
  method           String          // FIXED, PERCENTAGE, PER_WEIGHT
  value            Decimal         @db.Decimal(18, 2) // Input value entered by user (e.g. 5.00)
  calculatedAmount Decimal         @db.Decimal(18, 2) // Resolved monetary value in Rupees
  direction        String          @default("ADD")    // ADD or SUBTRACT
  sale             SaleTransaction @relation(fields: [saleId], references: [id], onDelete: NoAction, onUpdate: NoAction)
}
```

---

## 4. Adjustment Options & Validation

### 4.1 Type Constants
Allowed adjustment types for buyers are defined in `src/lib/constants.js`:
```javascript
export const ADJUSTMENT_TYPES_BUYER = [
  "Commission",
  "Labour",
  "Ghesai",
  "Market Fee",
  "Sootli"
];
```

### 4.2 Data Validation Schema
Adjustments are validated on both client and server via `src/modules/shared/validations/adjustmentSchema.js`:
```javascript
import { z } from "zod";

export const adjustmentSchema = z.object({
  adjustmentType: z.string().min(1, "Adjustment type is required"),
  method: z.enum(["FIXED", "PERCENTAGE", "PER_WEIGHT"]),
  value: z.coerce.number().min(0, "Value must be positive"),
  direction: z.enum(["ADD", "SUBTRACT"]).default("ADD"),
});
```

---

## 5. Calculation Logic (`src/lib/financial.js`)

Two core functions inside `financial.js` handle all mathematical logic.

### 5.1 Single Adjustment Resolution (`calculateAdjustment`)
Calculates the numerical amount of a single adjustment based on its method and values.

```javascript
export function calculateAdjustment(method, value, { baseAmount = 0, totalWeight = 0, bagCount = 0, rate = 0, unit = "KG" } = {}) {
  const val = Number(value);
  
  switch (method) {
    case "FIXED":
      return round(val);
    case "PERCENTAGE":
      return round((val / 100) * Number(baseAmount));
    case "PER_WEIGHT":
      return round(val * Number(totalWeight));
    case "PER_BAG":
      return round(val * Number(bagCount));
    case "WEIGHT_PER_BAG":
      const totalDeductedWeight = val * Number(bagCount);
      const convertedWeight = unit === "MAUND" ? totalDeductedWeight / 40 : totalDeductedWeight;
      return round(convertedWeight * Number(rate));
    default:
      return 0;
  }
}
```
*Note: While `PER_BAG` and `WEIGHT_PER_BAG` are coded in `calculateAdjustment` for supplier workflows, the `adjustmentSchema` limits Sales Invoices strictly to `FIXED`, `PERCENTAGE`, and `PER_WEIGHT`.*

### 5.2 Transaction Totals Calculation (`calculateTransactionTotals`)
Executes the high-level aggregation of items and adjustments to produce the final invoice amounts.

```javascript
export function calculateTransactionTotals(items = [], adjustments = []) {
  // 1. Calculate Base Amount using strictly normalized values
  let baseAmount = 0;
  let totalWeight = 0;

  items.forEach(item => {
    const itemWeight = Number(item.normalizedWeight || 0);
    const itemRate = Number(item.normalizedRate || 0);
    
    baseAmount += round(itemWeight * itemRate);
    totalWeight += itemWeight;
  });

  // 2. Apply Adjustments
  const result = calculateFinalTotal(baseAmount, adjustments, totalWeight);

  return {
    ...result,
    totalWeight: round(totalWeight)
  };
}

export function calculateFinalTotal(baseAmount, adjustments = [], totalWeight = 0, bagCount = 0, rate = 0) {
  const base = Number(baseAmount);
  
  const totalAdjustments = adjustments.reduce((acc, adj) => {
    const amt = calculateAdjustment(adj.method, adj.value, { baseAmount: base, totalWeight, bagCount, rate });
    return adj.direction === "SUBTRACT" ? acc - amt : acc + amt;
  }, 0);

  return {
    baseAmount: round(base),
    totalAdjustments: round(totalAdjustments),
    finalAmount: round(base + totalAdjustments)
  };
}
```

---

## 6. End-to-End Operational Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Buyer UI (SaleForm)
    participant Action as saleActions
    participant Service as SaleService
    participant Engine as financial.js
    database DB as MSSQL (Prisma)

    User->>User: Add Items and Adjustments
    User->>Engine: Call calculateTransactionTotals()
    Note right of User: Updates state and displays live totals in UI
    User->>Action: Submit Form (create/updateSaleAction)
    Action->>Service: Pass raw payload data
    Service->>Engine: Call calculateTransactionTotals() to verify totals
    Service->>Engine: Call calculateAdjustment() for each item to store calculatedAmount
    Service->>DB: Perform atomic transaction: write Sale & TransactionAdjustments
    DB-->>User: Return Saved Sale Invoice
```

### 6.1 UI Interactions (`SaleForm.js`)
1. The user inputs line items and optionally opens the **Adjustment Modal** to add new adjustments.
2. Form state updates the `adjustments` array with objects matching the structure:
   `{ adjustmentType: "Commission", method: "PERCENTAGE", value: 5, direction: "ADD" }`.
3. An effect triggers `updateTotals()`, calling `calculateTransactionTotals` using local items (normalized via `src/lib/units.js`) and adjustments.
4. Live summary fields (Base Amount, Total Adjustments, and Final Total) update instantly based on the derived totals.

### 6.2 Creation Flow (`SaleService.recordSale`)
1. The client invokes `createSaleAction(data)` which forwards payload to `SaleService.recordSale`.
2. Items are normalized using backend services.
3. The service calls `calculateTransactionTotals(processedItems, adjustments)` to determine the correct snapshot values (`baseAmount`, `totalAdjustments`, `finalAmount`).
4. **Calculated Amount Mapping**: Each adjustment is mapped to resolve its individual `calculatedAmount`:
   ```javascript
   const processedAdjustments = adjustments.map(adj => {
     const { id, saleId, ...cleanAdj } = adj;
     return {
       ...cleanAdj,
       calculatedAmount: calculateAdjustment(cleanAdj.method, cleanAdj.value, { baseAmount, totalWeight })
     };
   });
   ```
5. A database `$transaction` writes the invoice and nested adjustments:
   ```javascript
   await tx.saleTransaction.create({
     data: {
       // ... fields
       baseAmount,
       totalAdjustments,
       finalAmount,
       adjustments: { create: processedAdjustments }
     }
   });
   ```

### 6.3 Update Flow (`SaleService.updateSale`)
1. The client invokes `updateSaleAction(id, data)` which forwards to `SaleService.updateSale`.
2. The service fetches the old invoice to reconstruct the stock changes, and then recalculates totals for the updated items and adjustments.
3. Inside a database transaction, the previous adjustments are completely deleted to prevent accumulation:
   ```javascript
   await tx.transactionAdjustment.deleteMany({ where: { saleId: parseInt(id) } });
   ```
4. New adjustments are persisted using the `adjustments: { create: processedAdjustments }` nested mutation.

### 6.4 Status Updates and Deletions (`SaleService.updateStatus`, `deleteSale`)
Adjustments do not change when statuses are modified or when an invoice is soft-deleted. The calculated totals remain locked as snapshots. 

---

## 7. Guidelines for Implementing Supplier Adjustments

When replicating this pattern for **Supplier Invoices** (Settlements), the following adaptations must be planned:

1. **Schema Extension**:
   - Create a relation model for supplier adjustments (e.g. `SupplierInvoiceAdjustment` or general `TransactionAdjustment` updated to support `supplierInvoiceId`).
   - `SupplierInvoice` should store snapshots: `totalGrossValue`, `totalDeductions`, and `finalPayableAmount` (similar to `baseAmount`, `totalAdjustments`, and `finalAmount`).

2. **Types & Validation**:
   - Limit supplier adjustment options to `ADJUSTMENT_TYPES_SUPPLIER` (Labour, Brokerage, Aarhat, Sootli, Bardana, Transport-Rent, Loading).
   - Update validations or write a supplier-specific schema that handles methods like `PER_BAG` and `WEIGHT_PER_BAG` where appropriate.

3. **Settlement Granularity**:
   - Unlike sales where items are entered directly on the invoice, supplier invoices are settlements composed of *multiple existing Intake Transactions*.
   - Deductions can be applied *per intake transaction* (like `calculateSupplierDeductions` currently does for Kaat and Brokerage) or *at the summary level* for the entire settlement. The math engine must support both, ensuring that `bagCount` and `rate` contexts are correctly passed for item-level adjustments.
