# Aggregation-First Architecture & Caching System

This document outlines the performance-optimized design patterns implemented in Business Mart to minimize page load times, eliminate client-side API waterfall requests, and manage cache states effectively.

---

## 🚀 1. Aggregation-First Architecture

Historically, pages loaded multiple client-side components, each triggering separate API requests. This caused rendering waterfalls and severe latency. 

The **Aggregation-First** design model enforces the following rule:
> **One Page = One Server-Side Aggregate Query**

### Key Principles:
1. **Server-Side Fetching**: Data fetching is handled entirely in Server Components (e.g., `page.js`).
2. **Domain Aggregators**: Pages call domain-specific aggregators located in `src/modules/aggregations/`.
3. **Pure Presentation**: Client-side components (`*Client.js`) receive complete, serialized data payloads and remain stateless/declarative, avoiding fetch loops.

### Available Aggregators:
* **Dashboard Aggregator** (`getDashboardSummary`): Aggregates all KPI metrics, charts, and activities for the overview dashboard.
* **Ledger Aggregator** (`getLedgerOverview`): Fetches live reconciliation lists, active parties, and saved session logs.
* **Supplier Aggregator** (`getSupplierSettlementSetup` & `getUninvoicedSupplierData`): Loads suppliers, settings, and uninvoiced intakes/advances for settlements.

---

## 💾 2. Scoped Caching Layer

To optimize responsiveness, we use a scoped caching layer (`src/modules/aggregations/cache.js`).

### Cache Scope Buckets:
* `dashboard`: Scoped to dashboard metrics.
* `ledger`: Scoped to live ledger transactions, active parties, and configurations.
* `supplier`: Scoped to supplier lists, adjustment parameters, and uninvoiced item reports.

### WARNING: Production Scaling
The current caching layer is implemented using an in-memory `Map` in Node.js.
* **Scope**: Ideal for single-instance setups, local development, or desktop wrappers (e.g. Electron standalone wrappers).
* **Limitation**: Not distributed or persistent. It is **not production scalable** across multi-instance, serverless, or load-balanced cloud environments.
* **Scaling Recommendation**: To deploy to a scaled cloud infrastructure, swap this in-memory Map with **Redis** or Next.js `unstable_cache`.

---

## ⚡ 3. Granular Invalidation Triggers

Instead of globally clearing all cache buckets on every write operation, we perform **targeted, bucket-based invalidations** inside server actions (`*Actions.js`):

| Mutated Module / Action | Impacted Cache Buckets to Invalidate |
| :--- | :--- |
| **Intake / Advance Payments** | `dashboard`, `supplier` |
| **Sales Transactions** | `dashboard`, `ledger` |
| **Supplier Settlements** | `dashboard`, `ledger`, `supplier` |
| **Ledger Session Saved Snapshots** | `ledger` |
| **Product Registry** | `dashboard` |
| **Parties Registry / Profile Payments** | `dashboard`, `ledger`, `supplier` |

### Invalidation Pattern:
```javascript
import { invalidateCacheBucket } from "@/modules/aggregations/cache";

export async function createSaleAction(data) {
  try {
    const sale = await SaleService.recordSale(data);
    revalidatePath("/sales");
    
    // Invalidate caches dependent on sales data
    invalidateCacheBucket("dashboard");
    invalidateCacheBucket("ledger");
    
    return { success: true };
  } catch (error) { ... }
}
```

---

## 🔄 4. URL-Based State Synchronization

To prevent redundant fetching while maintaining interactive filters:
1. All filter controls (Date ranges, Supplier dropdowns, Buyer dropdowns) synchronize their state to URL query parameters (e.g. `?supplierId=12&preset=this_month`).
2. Selecting a filter updates the URL via `router.push(...)`.
3. The Server Component intercepts these search parameters, queries the Aggregator with the new filters, and updates the client component's initial props without reloading the page container.
