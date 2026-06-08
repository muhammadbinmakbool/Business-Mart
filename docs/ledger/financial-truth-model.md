# Business Mart Financial Truth Model v1

This document outlines the core financial architecture and data structures of the Business Mart ERP system. It serves as the single source of truth for developer onboarding, system maintenance, and feature design.

---

## 1. Core Architectural Philosophy
Business Mart uses a **Hybrid Event-Allocation Architecture**:
1. **Explicit Cash Recording:** Every cash flow (in or out) is stored as an immutable `PartyPayment` event.
2. **Traceable Settlement Mappings:** Payments are mapped to outstanding debts via the `PartyPaymentAllocation` model.
3. **Dynamic Read-Time Aggregation:** Client ledger balances, timelines, and unallocated credits are computed dynamically at read-time to prevent storage fragmentation or out-of-sync discrepancies.

---

## 2. Business Events (Primary Sources of Truth)
Business events represent physical or financial transactions occurring at a specific point in time. They are recorded directly in the database and do not depend on other tables for their state.

### A. Goods Inward: `IntakeTransaction`
* **Real-world action:** A supplier ships crop bags to the commission shop.
* **Fields:**
  * `id`: Auto-incrementing primary key.
  * `partyId`: References the supplier.
  * `weight` / `unit`: Total weight (e.g. Maunds or Kilograms).
  * `bags`: Number of physical bags.
  * `status`: `PENDING` (available for sale) or `SOLD`.
  * `entryDate`: Calendar day of intake.

### B. Goods Outward: `SaleTransaction`
* **Real-world action:** A buyer purchases crop inventory.
* **Fields:**
  * `id`: Primary key.
  * `saleNumber`: Unique code (`SAL-XXXXXX`).
  * `partyId`: References the buyer.
  * `finalAmount`: Total amount including adjustments (debit charge to buyer).
  * `paidAmount`: Portion of amount directly settled by payments (materialized credit).
  * `paymentStatus`: `PENDING`, `PARTIAL`, or `CLEARED`.

### C. Cash Payout/Advance: `IntakeAdvance`
* **Real-world action:** Cash is issued to a supplier as an advance payment on their crop intake.
* **Fields:**
  * `id`: Primary key.
  * `partyId`: References the supplier.
  * `amount`: Cash value issued.
  * `intakeTransactionId`: Optional link to a specific crop shipment.
  * `supplierInvoiceId`: Nullable; populated once the advance is adjusted during final billing.

### D. Cash Movement: `PartyPayment`
* **Real-world action:** Money is received from a buyer or paid to a supplier.
* **Fields:**
  * `id`: Primary key.
  * `partyId`: References the client party.
  * `paymentNumber`: Unique code (`PAY-XXXXXX`).
  * `paymentType`: `CASH_IN` (received cash) or `CASH_OUT` (disbursed cash).
  * `amount`: Total cash value.
  * `status`: `ACTIVE` (normal) or `VOIDED`.
  * `entryDate`: Calendar date of operation.

---

## 3. Mappings & Associations
Mapping tables connect primary business events to resolve financial allocations, inventory paths, and cost adjustments.

### A. Cash Allocation: `PartyPaymentAllocation`
Links a payment to the invoice(s) it settles.
* **Fields:**
  * `id`: Primary key.
  * `paymentId`: References `PartyPayment`.
  * `referenceType`: `SALE` (for buyers) or `SETTLEMENT` (for supplier invoices).
  * `referenceId`: The primary key of the target transaction.
  * `allocatedAmount`: Portion of the payment applied to this specific invoice.
* **Math Invariants:**
  $$\sum \text{allocatedAmount} \le \text{PartyPayment.amount}$$
  $$\text{Unallocated Amount} = \text{PartyPayment.amount} - \sum \text{allocatedAmount}$$

### B. Source Inventory Tracking: `SalesTrack`
Maps a buyer's sale items back to the supplier's intake transactions.
* **Fields:**
  * `intakeTransactionId`: References the source crop shipment.
  * `saleTransactionId`: References the destination sale.
  * `quantity` (weight): Amount of the intake weight allocated to this sale.
  * `buyingRate` / `sellingRate`: Rates applied to calculate trade commissions.

### C. Transaction Adjustments: `TransactionAdjustment` & `SupplierInvoiceAdjustment`
Connects operational deductions or additions (e.g. commission, labor, transport, Kaat) to invoices.
* **Fields:**
  * `adjustmentType`: `COMMISSION`, `LABOUR`, `RENT`, `KAAT`, etc.
  * `method`: `FIXED`, `PERCENTAGE`, or `PER_WEIGHT`.
  * `calculatedAmount`: The computed cash adjustment value.
  * `direction`: `ADD` (increases invoice total) or `SUBTRACT` (decreases invoice total).

---

## 4. Derived Documents (Calculated Views)
Derived documents are computed dynamically or generated at specific checkpoints to represent aggregate positions or settlement structures.

### A. Supplier Invoice: `SupplierInvoice`
* **Concept:** A settlement bill generated when a supplier's intakes are sold. It pools intakes, subtracts adjusted advances, applies adjustments, and generates a net payable amount.
* **Fields:**
  * `id`: Primary key.
  * `invoiceNumber`: Unique code (`SUP-XXXXXX`).
  * `partyId`: References the supplier.
  * `totalGrossValue`: Sum of gross sold crop prices.
  * `totalDeductions`: Sum of adjustments (commission, labor, etc.).
  * `totalAdvances`: Sum of adjusted `IntakeAdvance` values.
  * `finalPayableAmount`: Net payable position:
    $$\text{finalPayableAmount} = \text{totalGrossValue} - \text{totalDeductions} - \text{totalAdvances}$$
  * `paidAmount`: Portion settled by Cash Events.

### B. Chronological Ledger: `runningBalance`
* **Concept:** Chronological list of events representing the client's account balance history.
* **Calculation Rules:**
  * **Day Grouping:** Grouped by calendar day normalized in local business timezone (`Asia/Karachi`).
  * **Secondary Sort:** Sequenced by database insertion time (`createdAt`) to track exact operational occurrence.
  * **Ledger Flow:**
    $$\text{Balance}_{n} = \text{Balance}_{n-1} + \text{Debit}_n - \text{Credit}_n$$
    * *Debit:* Increases buyer debt (`SaleTransaction`, cash payouts).
    * *Credit:* Decreases buyer debt (`PartyPayment CASH_IN`, supplier invoice settlements).

### C. Net Outstanding Balance
* **Concept:** The overall current debt or credit status of a party.
* **Formula:** Matches the final `runningBalance` of the chronological timeline:
  $$\text{Net Outstanding} = \sum \text{Debits} - \sum \text{Credits}$$

---

## 5. Audit & Telemetry: `ActivityLog`
Captures an immutable, forensic audit trail of all actions across the platform.

* **Fields:**
  * `entityType`: `PRODUCT`, `PARTY`, `INTAKE`, `SALE`, `SETTLEMENT`, or `SYSTEM`.
  * `action`: `CREATED`, `UPDATED`, `DELETED`, `COMPLETED`, `CANCELLED`, `ARCHIVED`, `SUPERSEDED`, or `SOLD`.
  * `description`: User-friendly sentence explaining the change.
  * `meta`: JSON snapshot capturing the changed fields, previous states, and user details.
* **Behavior:** Written inside the database transaction of the corresponding operations to ensure logging cannot desynchronize from transaction success/failure.
