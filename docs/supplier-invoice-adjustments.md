# Supplier Invoice Adjustments Developer Guide

This document describes the architectural layout, database models, mathematical formulas, and lifecycle of **Billing Adjustments** in Supplier Invoices (`SupplierInvoice`). This guide serves as a technical reference for developers maintaining or extending the supplier settlements and deductions system.

---

## 1. Architectural Role and Principles

Adjustments represent additional charges or deductions calculated and applied to supplier settlements. Unlike Sales Invoices (where adjustments are calculated once on the final base amount), Supplier Invoices calculate adjustments **individually per intake** first, sum the resulting deductions, and then deduct the total from the gross value.

Key design principles include:
- **Per-Intake Granularity**: All adjustments are computed on each intake's specific context (gross weight, rate, unit, bag count) before totals are aggregated.
- **Centralized Math (Financial Boundary)**: Calculations are executed via `calculateSupplierDeductions` inside `src/lib/financial.js`.
- **Immutable Snapshots**: The resolved monetary value in Rupees (`calculatedAmount`) and configuration values (`value`, `method`, `direction`) are persisted as snapshots for audit integrity.
- **Prisma Cascade Behavior**: Adjustments are tightly coupled to their parent `SupplierInvoice` and deleted automatically on cascade delete.

---

## 2. File Structure and Components

The supplier adjustments flow spans the following files:

```
src/
├── app/
│   └── supplier-invoices/
│       ├── [id]/
│       │   └── page.js                      # Detail View: renders per-item breakdowns & adjustments table
│       └── create/
│           └── InvoiceGenerator.js          # UI Layer: Wizard interface to add/delete adjustments & preview math
├── lib/
│   ├── constants.js                         # Constants: defines ADJUSTMENT_TYPES_SUPPLIER
│   ├── financial.js                         # Math Engine: contains calculateSupplierDeductions
│   └── prisma.js                            # Prisma Client instance
└── modules/
    └── supplier-invoices/
        ├── controllers/
        │   └── supplierInvoiceActions.js     # Entrypoint: parses adjustments from Form Data
        ├── repositories/
        │   └── SupplierInvoiceRepository.js  # DB Interface: nested writes and includes adjustments
        └── services/
            └── SupplierInvoiceService.js     # Business Logic: orchestrates calculations & persistence
```

---

## 3. Database Schema

Adjustments are stored in the `SupplierInvoiceAdjustment` model, which links to `SupplierInvoice` with an `onDelete: Cascade` constraint.

```prisma
model SupplierInvoice {
  id                 Int                         @id @default(autoincrement())
  invoiceNumber      String                      @unique // SUP-XXXXXX
  partyId            Int
  totalGrossValue    Decimal                     @db.Decimal(18, 2) // Sum of intake gross values
  totalDeductions    Decimal                     @db.Decimal(18, 2) // Sum of calculated adjustments
  totalAdvances      Decimal                     @db.Decimal(18, 2) // Sum of linked advances
  finalPayableAmount Decimal                     @db.Decimal(18, 2) // (Gross - Deductions) - Advances
  status             String                      @default("PENDING") // PENDING, PAID, SUPERSEDED
  version            Int                         @default(1)
  isOutdated         Boolean                     @default(false)
  items              SupplierInvoiceItem[]
  adjustments        SupplierInvoiceAdjustment[]
  // ... other fields
}

model SupplierInvoiceAdjustment {
  id                Int             @id @default(autoincrement())
  supplierInvoiceId Int
  adjustmentType    String          // Labour, Brokerage, Aarhat, Sootli, Bardana, Transport-Rent, Loading
  method            String          // FIXED, PERCENTAGE, PER_WEIGHT
  value             Decimal         @db.Decimal(18, 2) // User input value (e.g. 1.50)
  calculatedAmount  Decimal         @db.Decimal(18, 2) // Total resolved amount in Rupees across all intakes
  direction         String          @default("SUBTRACT") // ADD or SUBTRACT
  invoice           SupplierInvoice @relation(fields: [supplierInvoiceId], references: [id], onDelete: Cascade, onUpdate: NoAction)
}
```

---

## 4. Configuration and Validation Constants

### 4.1 Supplier Adjustment Types
Allowed adjustment types for suppliers are defined in `src/lib/constants.js`:
```javascript
export const ADJUSTMENT_TYPES_SUPPLIER = [
  "Labour",
  "Brokerage",
  "Aarhat",
  "Sootli",
  "Bardana",
  "Transport-Rent",
  "Loading"
];
```

### 4.2 Supported Methods
Supplier adjustments strictly support three mathematical methods:
1. `PERCENTAGE`: Calculated as `(value / 100) * Gross Intake Amount`.
2. `PER_WEIGHT`: Calculated as `value * Intake Weight (KG)`.
3. `FIXED`: Applied as a flat fee on the intake.

---

## 5. Centralized Calculations (`src/lib/financial.js`)

The calculation engine computes each adjustment on a per-intake basis.

```javascript
export function calculateSupplierDeductions(intakes = [], adjustments = []) {
  let totalGrossValue = 0;
  let totalDeductions = 0;

  const intakeBreakdowns = intakes.map(intake => {
    const weight = intake.netWeight !== null && intake.netWeight !== undefined 
      ? Number(intake.netWeight) 
      : Number(intake.grossWeight || 0);
    const rate = intake.rate !== null && intake.rate !== undefined ? Number(intake.rate) : 0;
    const gross = round(weight * rate);
    
    let itemDeductions = 0;
    const calculatedAdjs = adjustments.map(adj => {
      let amt = 0;
      const val = Number(adj.value);
      
      switch (adj.method) {
        case "FIXED":
          amt = val;
          break;
        case "PERCENTAGE":
          amt = (val / 100) * gross;
          break;
        case "PER_WEIGHT":
          amt = val * weight;
          break;
        default:
          amt = 0;
      }
      
      amt = round(amt);
      if (adj.direction === "SUBTRACT") {
        itemDeductions += amt;
      } else {
        itemDeductions -= amt; // Adding values offsets deductions
      }

      return {
        adjustmentType: adj.adjustmentType,
        method: adj.method,
        value: val,
        direction: adj.direction,
        calculatedAmount: amt
      };
    });

    totalGrossValue += gross;
    totalDeductions += itemDeductions;

    return {
      intakeId: intake.id,
      gross: gross,
      deductions: itemDeductions,
      net: round(gross - itemDeductions),
      adjustments: calculatedAdjs
    };
  });

  return {
    totalGrossValue: round(totalGrossValue),
    totalDeductions: round(totalDeductions),
    netValue: round(totalGrossValue - totalDeductions),
    intakeBreakdowns
  };
}
```

---

## 6. End-to-End Operational Lifecycle

### 6.1 Generation Workflow (`SupplierInvoiceService.generateInvoice`)
1. Client submits selected intakes, advances, and the `adjustments` list.
2. The service calls `calculateSupplierDeductions(intakes, adjustments)` to retrieve the per-intake breakdowns and final totals.
3. **Calculated Amount Aggregation**: Because adjustments are saved globally for the invoice but calculated per-intake, the service sums the calculated amounts across all selected intakes for each adjustment record:
   ```javascript
   const processedAdjustments = adjustments.map(adj => {
     let totalAmt = 0;
     intakeBreakdowns.forEach(breakdown => {
       const match = breakdown.adjustments.find(
         a => a.adjustmentType === adj.adjustmentType && 
              a.method === adj.method && 
              Number(a.value) === Number(adj.value)
       );
       if (match) totalAmt += match.calculatedAmount;
     });
     return { ...adj, calculatedAmount: totalAmt };
   });
   ```
4. Saves records inside a transaction using nested writes in `SupplierInvoiceRepository.createWithItems`.

### 6.2 Regeneration Workflow (`SupplierInvoiceService.regenerateInvoice`)
1. Used when underlying intakes or advances change, or when adjustments are edited on an existing invoice.
2. The old invoice is marked `SUPERSEDED`.
3. Fresh data for intakes and advances is fetched.
4. If new adjustments are passed, they are used; otherwise, the service falls back to copying the previous adjustments.
5. Recursively recalculates and maps totals, saving a new version `V(x+1)`.

### 6.3 Interface Layout & Rendering (`InvoiceGenerator.js`)
- **Step 3 (Preview)**:
  - Users can click "Add Adjustment" to configure values.
  - The interface loops through `intakeBreakdowns` to display inline applied adjustments (e.g. `Brokerage: -Rs. 250.00`) and the resulting Net Intake Value for each selected item card.
- **Detail View (`page.js`)**:
  - Automatically invokes `calculateSupplierDeductions` at render-time using snapshot rates and weights from `SupplierInvoiceItem` database records.
  - Renders inline items breakdown tables and a separate overall Billing Adjustments Summary card.
