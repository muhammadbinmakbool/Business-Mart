# Derived Party Financial Position Engine Architecture

This document describes the design, math, and guidelines for the Derived Party Financial Position Engine implemented in Phase 2B.

---

## 🧠 Core Principles

1. **Single Source of Truth**:
   * The active payments and allocation tables (`PartyPayment` and `PartyPaymentAllocation`) represent the single source of truth for payment operations.
   * Stored `paidAmount` or clearing status columns on invoice tables (`SaleTransaction` and `SupplierInvoice`) are ONLY view-only cache copies synchronized during writes. They are **never** queried or relied on to evaluate financial status inside the core engine.

2. **Decoupled Architectural Layers**:
   * **Persistence**: DB storage using Prisma repositories.
   * **Data-Shaping & Retrieval**: Done in Services (e.g., `SaleService`, `SupplierInvoiceService`, `PartyProfileService`) via repository files.
   * **Pure Arithmetic**: Enforced purely inside `@/lib/financial.js` (and `@/lib/units.js` for weights). These math operations are database-independent and deterministic.

3. **No Direct Service-level Database Queries**:
   * Services must use explicit repositories (e.g., `PartyRepository`) for all persistence access.

---

## 🧮 Mathematical Engine

All financial arithmetic is located in `@/lib/financial.js`:

### 1. Canonical Definition of Paid Amount
The paid amount of an invoice is defined strictly as the sum of its allocation records:
```javascript
export function calculatePaidAmountFromAllocations(allocations = []) {
  return allocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
}
```

### 2. Invoice Clearing
Clearance status and remaining amounts are derived:
```javascript
export function calculateInvoiceClearingFromAllocations(totalAmount, allocations = []) {
  const total = Number(totalAmount || 0);
  const paid = calculatePaidAmountFromAllocations(allocations);
  const remaining = Math.max(0, total - paid);

  let paymentStatus = "PENDING";
  let isCleared = false;

  if (paid >= total) {
    paymentStatus = "CLEARED";
    isCleared = true;
  } else if (paid > 0) {
    paymentStatus = "PARTIAL";
  }

  return { total, paid, remaining, paymentStatus, isCleared };
}
```

### 3. Net Financial Position
Net Position groups transactions into clear obligations and cash movements:
$$\text{netPosition} = (\text{totalSales} + \text{unadjustedAdvances} + \text{totalPaymentsOut}) - (\text{totalPurchases} + \text{totalPaymentsIn})$$

* Positive position represents a net **Debit / Receivable** (the party owes us).
* Negative position represents a net **Credit / Payable** (we owe the party).

---

## 🛠️ Code Conventions & Rules
* **No Database queries in helpers**: Data must be queried in the service layer first, then passed to the calculation helpers.
* **Keep arithmetic pure**: Do not perform remaining balance calculations (`Math.max(0, total - paid)`) inline in services. Use `calculateInvoiceClearingFromAllocations`.
