# Party Profile & Financial Intelligence Layer

This document describes the architecture, mathematical model, and implementation details of the unified, read-only analytical **Party Profile & Financial Intelligence Dashboard** (`/parties/[partyId]`) in the Business Mart ERP.

---

## 🎯 1. Architectural Philosophy

The Party Profile is a **zero-write analytical overview layer**. To prevent financial drift and avoid maintaining duplicated ledger states, this module never writes financial records to the database. Instead, it aggregates live transactional feeds on the fly into:
1. An **Official Balance Sheet** representing audited accounting truth.
2. A **Forecast Balance overlay** representing tentative operational projections.
3. A **Unified Chronological Timeline** tracking the chronological lifecycle of the relationship.

---

## ⚖️ 2. The Derived Financial Truth Model

To maintain perfect alignment with ledger expectations, the profile utilizes a strict double-entry equivalent derived financial formula.

```
                  +-------------------------------------------------+
                  |                   PARTY DEBITS                  |
                  |  [Active Sales] + [Advances] + [Paid Settl.]   |
                  +-----------------------+-------------------------+
                                          |
                                          v
                                   [Minus Balance]
                                          |
                                          v
                  +-----------------------+-------------------------+
                  |                  PARTY CREDITS                  |
                  |    [Realized Credit]  +  [Pending Credit]*      |
                  +-------------------------------------------------+
                                              *Forecast UI Overlay Only
```

### 🟢 Debits (DR) — What the party owes us, or what we paid them
* **Active Sales (DR):** The sum of `finalAmount` of all active sales transactions (`isDeleted: false` and `status: { not: "CANCELLED" }`).
* **Cash Advances Given (DR):** The sum of `amount` of all `IntakeAdvance` records given to the supplier.
* **Settlement Payments Paid (DR):** The sum of `finalPayableAmount` of completed supplier invoices (`status === "COMPLETED"`). This represents cash outflows rather than simple billing generation.

### 🔴 Credits (CR) — Split visually and mathematically
To prevent "phantom credit" confusion, the credit calculations are strictly segregated:
1. **Realized Credit (Billed Intakes):** The sum of finalized net values (`totalGrossValue - totalDeductions`) of active `SupplierInvoice` records (`status: { not: "SUPERSEDED" }`).
2. **Pending Credit (Unbilled Intakes):** The sum of tentative values of non-cancelled `IntakeTransaction` entries that have **not** been billed.
   * `billingWeight = netWeight ?? grossWeight`
   * `actualRate = convertRate(rate, rateUnit, unit, product)`
   * `Estimated Value = billingWeight * actualRate`

### ⚖️ Net Balances
* **Official Balance (Financial Truth):** `Total Debits - Realized Credit`. This is the verified, accounting-grade outstanding balance.
* **Forecast Balance (UI Overlay Only):** `Total Debits - (Realized Credit + Pending Credit)`. An analytical visual indicator showing the anticipated position once all pending arrivals are billed.

---

## 🛠️ 3. Service Layer Architecture

The profile service, located at [PartyProfileService.js](file:///d:/Projects/Next%20JS/src/modules/parties/services/PartyProfileService.js), is cleanly separated into three decoupled internal layers:

### A. Data Fetch Layer
Loads all raw transactions in a single optimized database join query:
```javascript
const party = await prisma.party.findUnique({
  where: { id: pId },
  include: {
    saleTransactions: { where: { isDeleted: false, status: { not: "CANCELLED" } } },
    intakeTransactions: { where: { status: { not: "CANCELLED" } }, include: { product: true, invoiceItems: { include: { invoice: true } } } },
    intakeAdvances: true,
    supplierInvoices: { where: { status: { not: "SUPERSEDED" } }, include: { items: true } }
  }
});
```

### B. Financial Aggregation Layer
Performs the derived calculations to produce `totalSales`, `totalAdvances`, `totalPaidInvoices`, `realizedCredit`, `pendingCredit`, `officialBalance`, and `forecastBalance`.

### C. Timeline Builder Layer (Storytelling)
Builds a unified, chronological ledger feed with **zero double-counting**:
* **Sales:** Mapped as Debit events using `finalAmount`.
* **Advances:** Mapped as `CASH_OUT` Debit events on `createdAt`.
* **Settlements:** Modeled as `CASH_OUT` Debit events of `finalPayableAmount` only when `status === "COMPLETED"` (representing payment completion on `updatedAt`).
* **Intakes (Credit):** Placed chronologically on `entryDate`.
  * **If Billed:** Uses the **finalized invoice item amount** (favors finalized records).
  * **If Unbilled:** Uses the **estimated tentative value** (flexible container approach).
  * *Important:* The `SupplierInvoice` parent document itself is **never** added directly to the timeline. This avoids double-counting since its underlying intakes are already registered as the Credit events.

---

## 🎨 4. DOM Nesting & Hydration Safety Rules

During implementation, we established critical patterns regarding interactive card UI elements in React/Next.js:

> [!WARNING]
> **Hydration nesting violations:**
> Standard HTML prohibits placing an anchor tag (`<a>`) inside another anchor tag. In Next.js, nesting a `<Link>` component inside another `<Link>` results in nested `<a>` elements, triggering severe browser console warnings, breaking hydration, and causing dynamic layout collapses.

### Resolution Pattern
To make a dashboard listing card clickable to navigate to a profile page while hosting inner control elements (like Edit or Delete buttons):
1. **Convert the outer wrapper** from a `<Link>` to a standard `<div>` with styling controls (`cursor-pointer`).
2. Use Next.js client router hooks (`useRouter()`) to handle the navigate transition dynamically:
   ```javascript
   const router = useRouter();
   // Card Container
   <div onClick={() => router.push(`/parties/${party.id}`)} className="cursor-pointer">
   ```
3. **Capture click propagation** on the inner control buttons using `e.stopPropagation()` to prevent the outer card click handler from firing when a user triggers an individual control action:
   ```javascript
   <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
     <Link href={`/parties/${party.id}/edit`} onClick={(e) => e.stopPropagation()}>
       <Edit2 />
     </Link>
     <DeleteButton id={party.id} />
   </div>
   ```

---

## 🔬 5. Future Analytical Enhancements

The page includes premium visual placeholders for long-term intelligence additions (currently locked in the UI):
* **Credit Limit Analytics:** Visual progress bars matching outstanding DR values against customizable party caps.
* **Risk Scoring Gauge:** Derived indicators checking invoice aging, average payment latency, and intake consistency.
* **Payment Delay Insights:** Real-time tracking of the average days between a `SupplierInvoice` creation date and its completed payment date (`status === "COMPLETED"`).
