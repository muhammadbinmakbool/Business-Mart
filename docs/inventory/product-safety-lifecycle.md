# Product Safety & Deactivation Lifecycle Guide

This document defines the architectural rules and constraints governing **Product Deactivation (Disabling)** and **Product Deletion** in Business Mart. Developers working on products, intakes, sales, or settlements **must** strictly adhere to these rules.

---

## 1. Product Deletion Safety & Integrity

### Core Principle
> **Physical deletion of a product is strictly forbidden if it contains any historical traces.**

If a product has been used even once in the system, deleting it breaks database referential integrity, violates SQL Server foreign key constraints, and corrupts financial ledger history.

### The Guard Mechanism
Before performing a deletion, `ProductRepository.delete(id)` executes active validation checks:
1. **Intake Transaction Check**: Blocks deletion if any goods arrivals (Intakes) are linked.
2. **Sales Invoice Check**: Blocks deletion if the product is listed in any sales invoices.
3. **Transaction Track Check**: Blocks deletion if any ledger traces (`SalesTrack`) refer to it.

If any check fails, the repository raises a clear validation error, which is caught and surfaced as a dark-mode-styled error toast:
> *"Cannot delete product because it has associated intake transactions. Deactivate the product instead to prevent future selections."*

### Clean Deletion Rule
Only newly created products with **absolutely zero history** can be deleted from the database.

---

## 2. Product Deactivation (Disabling) Lifecycle

Deactivating a product (`isActive = false`) suspends **future operations** while preserving **historical ledger continuity**.

```mermaid
graph TD
    subgraph Future Operations (HALTED)
        A[New Goods Intake Arrival] -->|Blocked| H[Suspend]
        B[New Direct Sales Invoice] -->|Blocked| H
        C[Remaining Intake Weight Sale] -->|Blocked| H
    end
    subgraph Historical Ledger (PERMITTED)
        D[Bill Pre-Existing Sales Track] -->|Allowed| P[Complete]
        E[Generate Supplier Settlement] -->|Allowed| P
    end
```

---

## 3. Detailed Transaction Constraints

### A. Halting Future Commercial Operations (Blocked 🛑)
To prevent disabled products from leaking into the active market, the system enforces strict blocks in the service layers:

1. **New Direct Sales (`SaleService.recordSale` & `updateSale`)**:
   * Blocked if the product's `isActive` flag is `false` and there is no pre-existing sales track:
     ```javascript
     if (!product.isActive && !item.salesTrackId) {
       throw new Error(`Product "${product.name}" is disabled/inactive and cannot be sold. Please reactivate the product first.`);
     }
     ```

2. **New Arrivals (`IntakeService.createIntake`)**:
   * Blocked to prevent recording new stock arrivals:
     ```javascript
     if (!product.isActive) {
       throw new Error(`Product "${product.name}" is disabled/inactive. New goods intakes cannot be created for disabled products.`);
     }
     ```

3. **Remaining Intake Selling (`IntakeService.sellIntake` & `updateIntake`)**:
   * Selling the remaining weight of a pending or partially sold intake is strictly **blocked** when the status is updated to `SOLD` or `PARTIAL`:
     ```javascript
     if (intake.product && !intake.product.isActive) {
       throw new Error(`Product "${intake.product.name}" is disabled/inactive. Further transactions, arrivals, or selling of this product are suspended until it is reactivated.`);
     }
     ```

---

### B. Completing Historical Settlements (Allowed ✅)
To avoid freezing payouts, unpaid supplier balances, or outstanding buyer accounts receivable, the system **explicitly permits** completing transactions that occurred *before* deactivation:

1. **Billing Pre-Existing Sales Tracks (`SaleService.recordSale` / `updateSale`)**:
   * When creating a Sales Invoice from an already sold portion (using `salesTrackId`), the validation bypasses the active check. This allows the business to legally bill buyers for past sales of now-deactivated products.

2. **Supplier Settlements (`SupplierInvoiceService.generateInvoice` / `editInvoice`)**:
   * Supplier Settlements and Settlements Invoices are completely **allowed** for historically sold intakes of deactivated products, securing accounts payable integrity.

---

## 4. Implementation Reference Guide

| Module | Service / File | Method | Constraint Implemented |
| :--- | :--- | :--- | :--- |
| **Products** | [ProductRepository.js](file:///d:/Projects/Next%20JS/src/modules/products/repositories/ProductRepository.js) | `delete(id)` | Strict count query checks before physical DB delete |
| **Sales** | [SaleService.js](file:///d:/Projects%20JS/src/modules/sales/services/SaleService.js) | `recordSale` / `updateSale` | Bypasses `isActive` check only if `item.salesTrackId` exists |
| **Intake** | [IntakeService.js](file:///d:/Projects%20JS/src/modules/intake/services/IntakeService.js) | `createIntake` | Blocks new pending arrival records if product deactivated |
| **Intake** | [IntakeService.js](file:///d:/Projects%20JS/src/modules/intake/services/IntakeService.js) | `updateIntake` / `sellIntake` | Blocks selling of remaining weight in lifecycle status changes |

---

## 5. Bag Product Architectural Lock

To maintain absolute clarity, remove unit selection ambiguity, and prevent weight/bag recalculation drift, the system enforces a strict architectural boundary between **Bulk Products** and **Bag Products**.

### A. Classification Rules
1. **Bulk Products**: (e.g. Basmati Rice, Wheat, Sugar)
   * Stored under standard category `WEIGHT`.
   * Stored in primary unit `KG` or `MAUND`.
   * **Allowed Units:** Selectable standard weight units (`KG`, `MAUND`, `TON`) are permitted.
   * **Source of Truth:** Physical weight in base unit (KG) is the absolute source of truth.

2. **Bag Products**: (e.g. Rice 20 KG Bag, Rice 40 KG Bag, Mango 50 KG Bag)
   * Stored with `primaryUnit = "BAG"` or `category = "BAG"`.
   * **Distinct Product Records:** Every bag size variation **must** be created as a completely separate product record with its own fixed `unitConversion` factor.
   * **Allowed Units:** **Only `BAG` is selectable.** KG, MAUND, and other weight units are disabled/hidden in all forms.
   * **Source of Truth:** The entered quantity in `BAG` is the source of truth, and weight in KG is a derived value.

### B. Partial Intake Invariant Lock
When a product's `unitConversion` (bag size) changes in product settings, the system executes a mathematically safe recalculation strategy that protects historical sold records:

1. **Historical Sold Portion**:
   * **MUST NEVER** be recalculated under any condition. Already sold allocations and traceability records are frozen forever using the historical conversion factor at the time of sale.
2. **Remaining Portion**:
   * **Unsold stock sitting in the warehouse** is recalculated dynamically using the new conversion factor to reflect physical warehouse changes.

### C. Recalculation Formula (Option 1 Safe Model)
For active `BAG`-entered intakes of a product when `unitConversion` is updated:

$$\text{newNormalizedWeight} = \left[(\text{grossWeight} - \text{remainingWeight}) \times \text{oldConversion}\right] + (\text{remainingWeight} \times \text{newConversion})$$

* **For `PENDING` Intakes (completely unsold):**
  $$\text{newNormalizedWeight} = \text{grossWeight} \times \text{newConversion}$$
* **For `PARTIAL` Intakes (partially sold):**
  The sold portion remains frozen at the old conversion rate, and only the unsold remaining portion is recalculated under the new conversion rate.
* **For `SOLD`, `CLEARED`, or `CANCELLED` Intakes:**
  Completely skipped and untouched to preserve static historical accounting integrity.
