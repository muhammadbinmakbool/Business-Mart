# Dynamic Adjustments System Architecture

This developer guide describes the architecture and integration of the Dynamic Adjustment Definition system within the Business Mart ERP.

---

## 🎯 1. Core Philosophy: Templates vs. Snapshots

To support diverse business configurations while guarding historical transaction integrity, the system divides adjustments into two distinct representations:

1. **`AdjustmentDefinition` (Master Data Templates)**: Reusable configuration rules created and managed by a Super Admin. They describe properties like:
   * **`code`**: Unique identifier (immutable after creation).
   * **`method`**: Calculation mode (`PERCENTAGE`, `FIXED`, `PER_WEIGHT`, etc.).
   * **`direction`**: Math operation direction (`ADD`, `SUBTRACT`).
   * **`isUserEditable`**: Boolean flag blocking/allowing manual adjustments override in the form.
   * **`isEnabledByDefault`**: Auto-populates in new invoices.

2. **`TransactionAdjustment` / `SupplierInvoiceAdjustment` (Snapshots)**: Flat, static copies of the definition saved *at the point of sale*. They store the applied metadata:
   * **`code`**: Points to the original definition.
   * **`isLegacySnapshot`**: Flags records imported/generated under the legacy hardcoded adjustment system.

---

## 🔒 2. Historical Integrity & "Snapshot Source Lock"

Once a transaction (Sale or Supplier Settlement) is saved:
* The transaction record **does not join or re-fetch** the master `AdjustmentDefinition` table.
* The invoice printing, detail views, and edit views consume the static snapshot columns on the adjustment entry.
* If a Super Admin edits or deletes the master `AdjustmentDefinition`, historical transactions remain completely unaffected.

---

## 🗄️ 3. Database Schema

The SQLite and MS SQL schemas are kept fully aligned:

```prisma
model AdjustmentDefinition {
  id                    Int      @id @default(autoincrement())
  code                  String   @unique
  name                  String
  applicableTo          String   // "BUYER", "SUPPLIER", "BOTH"
  method                String   // "FIXED", "PERCENTAGE", "PER_WEIGHT", "PER_BAG"
  direction             String   // "ADD", "SUBTRACT"
  defaultConfiguredValue Float?
  isUserEditable        Boolean  @default(true)
  isEnabledByDefault    Boolean  @default(false)
  isSystemDefined       Boolean  @default(false)
  version               Int      @default(1)
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

Snapshot fields in transaction adjustment tables:
```prisma
model TransactionAdjustment {
  id                 Int         @id @default(autoincrement())
  transactionId      Int
  adjustmentType     String      // Snapshotted Name
  code               String      @default("LEGACY")
  isLegacySnapshot   Boolean     @default(false)
  method             String      // FIXED, PERCENTAGE, etc.
  value              Float
  direction          String      // ADD, SUBTRACT
  unit               String?
  // ... relationships
}
```

---

## 💻 4. UI Layer Integration & Locking Policies

Forms dynamically handle adjustments by loading the templates on mount:
* **Default Pre-population**: When opening a Sale/POS Cart or adding an Intake to a Settlement, the form queries active definitions with `isEnabledByDefault: true` and initializes the defaults.
* **Reactive Inline Value Editing**: Users can edit values directly inside grid inputs for flexibility.
* **Rule Enforcement Controls**: If `isUserEditable` is `false` on a definition (e.g. system tax/GST), input controls are set to `disabled` (or rendered as read-only badges) in the UI, enforcing system compliance.
