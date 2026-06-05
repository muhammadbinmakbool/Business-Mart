# Activity Logging Architecture & Ledger Boundaries

This document defines the architecture, layer boundaries, and implementation guidelines for the centralized activity logging system in Business Mart.

---

## 1. Architectural Layers & Separation of Concerns

To maintain long-term stability and prevent regression bugs, the system enforces a strict separation between **audit visibility (logs)** and **financial truth (ledger)**:

```text
[ Ledger / Accounting Layer ]  ──(Writes State)──>  [ DB / schema.prisma ]
             │                                              │
             ▼                                              ▼
[ Activity Log / Audit Layer ] ──(Observes Event)─> [ ActivityLog DB Table ]
             │
             ▼
[ Derived Views / UI Layer ]   ──(Renders Details)─> [ User Interface ]
```

### The Passive Observer Rule
* The **Activity Log / Audit Layer** is a **strictly passive, uni-directional observer**. It listens to/logs service actions.
* The **Ledger / Accounting Layer** must **never** read from the `ActivityLog` table to make financial decisions, calculate balances, or perform ledger matching.
* Circular feedback loops (e.g. using `ActivityLog` records to drive financial state transitions) are strictly forbidden.

---

## 2. Centralized Logging API

All domain-specific activity logging is centralized in `src/modules/activity-log/activityLogger.js`. 

### Key Principles
1. **Stateless Service Context:** The logging helpers are stateless. They do not implicitly query the HTTP session/cookies to deduce the performing user. The service performing the action must resolve the operator context (`performedByUserId` and `performedByName`) and pass it explicitly.
2. **Metadata-Rich Payloads:** Every event must capture structured metadata (`meta`) rather than unstructured text descriptions alone. This metadata must include correlation identifiers (e.g. `partyId`, `saleId`, `invoiceNumber`, `amount`) for audit lookup.

### Service Logging Helpers
* `logPartyEvent(params)` - Track party lifecycle events (creation, profile updates, status toggles).
* `logSaleEvent(params)` - Track sales invoice processing, status changes, and clearing allocations.
* `logIntakeEvent(params)` - Track intake transactions (creation, status changes, sold status).
* `logSettlementEvent(params)` - Track supplier invoices and payment settlements.
* `logPaymentEvent(params)` - Track direct cash collections (Cash In) and payouts (Cash Out).

---

## 3. Timeline Reconstruction

The Party Profile page displays a chronological transaction timeline by merging records from both accounting and audit sources.

### Data Sources
* **Accounting Tables:** Sales (`saleTransactions`), Supplier Invoices (`supplierInvoices`), and Advances (`intakeAdvances`).
* **Audit Tables:** Status changes and direct cash payments are fetched from the `ActivityLog` table (filtered by `entityType: "PARTY"` and `entityId`).

### Chronological Sorting & Running Balance
To prevent visual gaps, timeline entries are compiled dynamically:
1. All events are projected to a common timeline schema:
   * **Debit (DR):** Customer purchases (Sales) and cash payouts to suppliers.
   * **Credit (CR):** Cash received from customers (Cash In) and invoice liabilities from suppliers.
2. The list is sorted chronologically (ascending) to compute the correct `runningBalance`.
3. The list is sorted descending for presentation (latest events first).

---

## 4. Unallocated Cash: Boundary Guidelines

When a customer pays more than their outstanding invoice balance (e.g., Cash In of Rs. 100,000 against a Rs. 60,000 invoice), the remaining Rs. 40,000 is **unallocated cash**.

### Phase 1 Treatment (Current State)
* **Transient Audit Value:** The unallocated amount is stored **exclusively** inside the metadata and description of the `ActivityLog` record. 
* **Excluded from Accounting:** The unallocated amount is **not** written to financial ledger tables (`PartyPayment` / `PartyPaymentAllocation`).
* **Ledger Formula Pureness:** The `officialBalance` formula in `PartyProfileService` ignores the unallocated cash. It represents outstanding invoice obligations only.

### Phase 2 Boundary Design Rules
When implementing unallocated cash ledger integration in Phase 2, developers **must** adhere to these rules:
1. **No Premature Financial Behavior:** Do not modify the `officialBalance` formula to subtract unallocated cash until business rules explicitly define whether unallocated cash represents:
   * **Case A (Accounting Liability):** Customer credit reducing ledger liability.
   * **Case B (Operational Buffer):** Suspense holding account.
   * **Case C (Deferred State):** Pending refund or manual settlement.
2. **Represent State First:** Focus first on saving the payment and its allocations in `PartyPayment` and `PartyPaymentAllocation` models.
3. **Transaction Safety:** Ensure that all financial mutations and audit logs are written within the same database transaction context to prevent database/log inconsistencies if a rollback occurs.
