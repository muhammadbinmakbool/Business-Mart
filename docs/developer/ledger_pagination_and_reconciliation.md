# Ledger Pagination & Reconciliation Developer Guide

This document describes the pagination architecture implemented in the Ledger & Reconciliation workspace.

---

## 1. Architectural Overview

The Ledger module uses a hybrid pagination model divided into two major workspaces:

1. **Reconciliation History (Saved Snapshots)**:
   * **Pattern**: Server-side pagination.
   * **Rationale**: The database can store thousands of historical reconciliation logs. We retrieve only the active slice (e.g. 50 sessions per page) driven by URL query parameters.
   * **Implementation**: Uses `LedgerService.listSessionsPaginated` on the backend, which implements deterministic secondary sorting (`createdAt DESC, id DESC`).

2. **Live Reconciliation Workspace**:
   * **Pattern**: Client-side paginated display over in-memory filtered collection.
   * **Rationale**: The reconciliation dashboard computes live totals (base total, gross, deductions, advances, differences, tolerance, matching status) dynamically across all active, unreconciled transactions in a given month. Slicing on the database level would break the live calculations.
   * **Implementation**: We load the active transactions for the period, compute the dashboard statistics on the full dataset, and slice the table lists client-side for rendering (`pageSize = 15`).

---

## 2. Live Tables Inline Pagination

To prevent the `Supplier Settlements` and `Buyer Billing / Invoices` tables from growing infinitely and causing layout breakage:
* Both tables slice their render lists to a fixed page size (`15` items).
* Each table has dedicated inline pagination controls (`Previous`, `Next`, page indicators).
* Active page indexes are automatically reset to `1` when filters or dataset length changes (e.g. selecting a different supplier or buyer).

```javascript
// src/modules/ledger/components/ReconciliationTable.js
const [invPage, setInvPage] = React.useState(1);
const [salePage, setSalePage] = React.useState(1);
const pageSize = 15;

React.useEffect(() => {
  setInvPage(1);
}, [invoices.length]);
```

---

## 3. Hydration Mismatch Prevention

Because the Live Reconciliation date filters rely on timezone-dependent calculations (`new Date()` evaluated on the server during SSR vs the client browser timezone during hydration), rendering the date-filtered lists directly causes React hydration mismatch errors.

### The Solution: Mount State Protection
We render a static skeleton/loading state on the server, which matches the initial client render. Once the component mounts in the browser, it toggles a `mounted` state to `true` to render the interactive list data:

```javascript
const [mounted, setMounted] = React.useState(false);

React.useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
      {/* Skeleton / Loading state identical on server & client */}
    </div>
  );
}
```
This guarantees 100% hydration compatibility and eliminates console hydration warnings.
