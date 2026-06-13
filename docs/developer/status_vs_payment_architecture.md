# Status vs. Payment Clean Architecture Rules

This guide defines the strict boundary and usage rules between Operational Workflow Status (`status`) and Financial Settlement Status (`paymentStatus`) across the ERP system.

---

## 🚫 The Boundary Rule

*   **`status` (Workflow Status)**: Represents the **lifecycle stage** of a document (e.g. Draft, Active, Replaced). It controls operator permissions, edit locks, and workflow states.
*   **`paymentStatus` (Financial Status)**: Represents the **clearing state** of the transaction (e.g. Unpaid, Partially Paid, Paid). It tracks cash flow and balances.

---

## 📋 Rules for Developers

### Rule 1 — NEVER Mix Meanings in Queries

Do not filter or perform financial queries based on `status` values (like `"PENDING"`). Always check the correct attribute:

```javascript
// ❌ BAD: Mixing workflow status with finance/payment state
const unpaidInvoices = await prisma.supplierInvoice.findMany({
  where: { status: "PENDING" } 
});

// ✔ CORRECT: Use paymentStatus for checking unpaid items
const unpaidInvoices = await prisma.supplierInvoice.findMany({
  where: { paymentStatus: "PENDING" }
});
```

---

### Rule 2 — UI Must NEVER Show Raw Values

To avoid confusing operators with double-meanings of `"PENDING"`, raw database values must be mapped to distinct user-friendly labels at the presentation layer:

#### Workflow Status Mapping (`status` field)
| Database Value | UI Workflow Label | Description |
| :--- | :--- | :--- |
| `PENDING` | **Draft / Open** | The item is active and open for updates. |
| `COMPLETED` | **Finalized** | The item is locked from manual edits. |
| `CANCELLED` | **Replaced** / **Cancelled** | The item was voided or cancelled. |

#### Financial Status Mapping (`paymentStatus` field)
| Database Value | UI Money Label | Description |
| :--- | :--- | :--- |
| `PENDING` | **Unpaid** | No payments/advances have been allocated. |
| `PARTIAL` | **Partially Paid** | Partially cleared by allocations. |
| `CLEARED` | **Paid** | Fully cleared and balanced. |

---

### Rule 3 — Financial Calculations Must IGNORE Status

All ledger matching, double-entry reconciliation, and cash-balance calculations must ignore workflow `status` checks. 

*   **Ledgers and Aggregators** MUST compute balances using pure mathematical aggregates from the transactional tables or look explicitly at `paymentStatus` fields.
*   **Workflow transitions** (e.g., closing/finalizing an invoice) must not affect the financial ledger representation.
