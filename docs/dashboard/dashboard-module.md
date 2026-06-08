# Operational Dashboard Module (Control Room Visibility)

This document describes the architectural philosophy, decoupling safeguards, widget isolation design, and developer guidelines for the Business Mart Dashboard.

---

## 🧠 System Mental Model

The dashboard sits strictly **above** all other core ERP modules:

```txt
  +---------------------------------------------+
  |             Dashboard Module                |  <- Read-Only Observer Layer
  +---------------------------------------------+
    |           |            |            |
    v           v            v            v
+-------+   +--------+   +-------+   +------------+
| Sales |   | Intake |   | Stock |   | Ledger/SI  |  <- Core Transaction Engines
+-------+   +--------+   +-------+   +------------+
```

Core modules **MUST NEVER** import or depend on anything inside the dashboard module. The dashboard can be deleted entirely, and the ERP will continue to function.

---

## ⚠️ Architectural Isolation Rules

### 1. Strictly Read-Only
- The dashboard is purely observational.
- **NO mutations, inserts, or updates** are allowed from any dashboard widgets, service actions, or UI buttons.
- All dashboard data access is handled in read-only Prisma queries inside the `DashboardService`.

### 2. Zero Logic Duplication
- Formulas for invoice calculations, ledger reconciliation, unit conversions, and date formatting must be reused from their original source modules (e.g. `src/lib/reconciliation.js`, `src/lib/financial.js`).
- Never rewrite mathematical logic; call existing utility layers.

### 3. Widget Isolation & Fallbacks
- Each dashboard widget must act as a plug-and-play block.
- Widgets must **NEVER depend on each other's state or queries** ("no cross-widget dependency").
- Every widget is wrapped inside a `DashboardErrorBoundary` container. A runtime crash in the charts widget will not prevent the activity feed or summary stats from rendering.

---

## 📦 Widget Registry & Layouts

Widgets are registered in [widgetRegistry.js](file:///d:/Projects/Next%20JS/src/modules/dashboard/components/widgetRegistry.js).

### Configuration Options:
```javascript
{
  id: "summaryCards",
  name: "Summary Statistics",
  component: SummaryCardsWidget,
  enabled: true,
  gridClass: "col-span-full"
}
```

To hide or reorder a widget, modify the registry array.

---

## ⚡ Performance Rules
- **No full table scans**: Feeds and widget queries are capped at 10-15 rows (e.g., `take: 10`).
- **Batched Resolving**: When the dashboard loads, all database queries are resolved concurrently in `Promise.all` inside `DashboardService.getOverviewData()` to minimize database lock waits and roundtrip times.
