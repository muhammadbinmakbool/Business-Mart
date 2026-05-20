# Supplier Invoice Adjustments Developer Guide

This document describes the architectural layout, database models, mathematical formulas, and lifecycle of **Billing Adjustments** in Supplier Invoices (`SupplierInvoice`). This guide serves as a technical reference for developers maintaining or extending the supplier settlements and deductions system.

---

## 1. Architectural Role and Principles

Adjustments represent additional charges or deductions calculated and applied to supplier settlements. Unlike Sales Invoices (where adjustments are calculated once globally on the final invoice amount), Supplier Invoices calculate adjustments **individually per intake**. 

Key design principles include:
- **Per-Intake Granularity**: All adjustments are added directly to specific intakes rather than applied globally. Users can define different adjustment types or values for each intake separately.
- **Centralized Math (Financial Boundary)**: Calculations are executed via `calculateSupplierDeductions` inside `src/lib/financial.js` by passing intakes containing their nested adjustments array.
- **Immutable Snapshots**: The resolved monetary value in Rupees (`calculatedAmount`) and configuration values (`value`, `method`, `direction`) are persisted as snapshots nested under the respective `SupplierInvoiceItem` for audit integrity.
- **Prisma Cascade Behavior**: Adjustments are tightly coupled to their parent `SupplierInvoiceItem` and deleted automatically on cascade delete of the item or invoice.

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
│           └── InvoiceGenerator.js          # UI Layer: Wizard interface to add/delete adjustments per-intake
├── lib/
│   ├── constants.js                         # Constants: defines ADJUSTMENT_TYPES_SUPPLIER
│   ├── financial.js                         # Math Engine: contains calculateSupplierDeductions
│   └── prisma.js                            # Prisma Client instance
└── modules/
    └── supplier-invoices/
        ├── controllers/
        │   └── supplierInvoiceActions.js     # Entrypoint: parses adjustmentsByIntake map from Form Data
        ├── repositories/
        │   └── SupplierInvoiceRepository.js  # DB Interface: nested writes and includes adjustments per-item
        └── services/
            └── SupplierInvoiceService.js     # Business Logic: orchestrates calculations & persistence
```

---

## 3. Database Schema

Adjustments are stored in the `SupplierInvoiceAdjustment` model, which links to `SupplierInvoiceItem` with an `onDelete: Cascade` constraint.

```prisma
model SupplierInvoice {
  id                 Int                 @id @default(autoincrement())
  invoiceNumber      String              @unique // SUP-XXXXXX
  partyId            Int
  totalGrossValue    Decimal             @db.Decimal(18, 2) // Sum of intake gross values
  totalDeductions    Decimal             @db.Decimal(18, 2) // Sum of calculated adjustments
  totalAdvances      Decimal             @db.Decimal(18, 2) // Sum of linked advances
  finalPayableAmount Decimal             @db.Decimal(18, 2) // (Gross - Deductions) - Advances
  status             String              @default("PENDING") // PENDING, PAID, SUPERSEDED
  version            Int                 @default(1)
  isOutdated         Boolean             @default(false)
  items              SupplierInvoiceItem[]
  // ... other fields
}

model SupplierInvoiceItem {
  id                    Int                         @id @default(autoincrement())
  supplierInvoiceId     Int
  intakeTransactionId   Int
  weight                Decimal                     @db.Decimal(18, 2)
  rate                  Decimal                     @db.Decimal(18, 2)
  amount                Decimal                     @db.Decimal(18, 2)
  invoice               SupplierInvoice             @relation(fields: [supplierInvoiceId], references: [id], onDelete: Cascade)
  intake                IntakeTransaction           @relation(fields: [intakeTransactionId], references: [id])
  adjustments           SupplierInvoiceAdjustment[]
}

model SupplierInvoiceAdjustment {
  id                    Int                 @id @default(autoincrement())
  supplierInvoiceItemId Int
  adjustmentType        String              // Labour, Brokerage, Aarhat, Sootli, Bardana, Transport-Rent, Loading
  method                String              // FIXED, PERCENTAGE, PER_WEIGHT
  value                 Decimal             @db.Decimal(18, 2) // User input value (e.g. 1.50)
  calculatedAmount      Decimal             @db.Decimal(18, 2) // Resolved amount in Rupees for this specific item
  direction             String              @default("SUBTRACT") // ADD or SUBTRACT
  item                  SupplierInvoiceItem @relation(fields: [supplierInvoiceItemId], references: [id], onDelete: Cascade)
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

The calculation engine computes each adjustment on a per-intake basis, pulling the adjustments nested inside each intake object.

```javascript
export function calculateSupplierDeductions(intakes = []) {
  let totalGrossValue = 0;
  let totalDeductions = 0;

  const intakeBreakdowns = intakes.map(intake => {
    const weight = intake.netWeight !== null && intake.netWeight !== undefined 
      ? Number(intake.netWeight) 
      : Number(intake.grossWeight || 0);
    const rate = intake.rate !== null && intake.rate !== undefined ? Number(intake.rate) : 0;
    const gross = round(weight * rate);
    
    let itemDeductions = 0;
    const itemAdjustments = intake.adjustments || [];
    const calculatedAdjs = itemAdjustments.map(adj => {
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
1. Client submits selected intakes, advances, and `adjustmentsByIntake` map: `{ [intakeId]: [ { adjustmentType, method, value, direction } ] }`.
2. The service maps adjustments into the intakes array and invokes `calculateSupplierDeductions(intakesWithAdjustments)`.
3. Prepares immutable snapshots for items with nested adjustments.
4. Saves records inside a transaction using nested item write in `SupplierInvoiceRepository.createWithItems`.

### 6.2 Regeneration Workflow (`SupplierInvoiceService.regenerateInvoice`)
1. Used when underlying intakes/advances are modified, or adjustments are updated on an existing invoice.
2. The old invoice is marked `SUPERSEDED`.
3. Fresh data for intakes and advances is fetched.
4. Falls back to copying adjustments from the old invoice items if no map is provided.
5. Maps and recalculates totals, saving a new version `V(x+1)`.

### 6.3 Interface Layout & Rendering
- **Invoice Generation Wizard (`InvoiceGenerator.js`)**:
  - In **Step 3 (Preview)**, each intake card acts as a self-contained manager.
  - Users can click "Add" to open a modal and configure a custom adjustment specifically for that intake.
  - Displays list of applied adjustments inline with delete icons, automatically calculating values in real-time.
- **Detail View (`page.js`)**:
  - Fetches nested adjustments per-item using prisma relation.
  - Renders inline items breakdown tables with their respective deductions.
  - Groups and sums identical adjustments across all items to build a unified Billing Adjustments Summary card.
