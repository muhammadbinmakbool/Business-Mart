# Inventory Settings Subsystem Documentation

The Inventory Settings subsystem manages system-wide operational behavior flags, validation rules, alerts, and UI filters related to stock management and product selection.

---

## ⚠️ Core Architectural Rule: Presentation & Validation Only

Inventory Settings represent **Behavioral Configuration only**. They must **never** influence:
1. Core stock balances or transaction calculations.
2. Financial rates, rounding, or monetary math.
3. Ledger matching or reconciliation history.

**NO business calculations or stock calculation logic is allowed inside this module.** It exists strictly as a read-only metadata overlay.

---

## 🗄️ Storage Schema & Key

Inventory settings are serialized and persisted in the `SystemSetting` SQL Server table under the unique key:

```text
inventory_settings
```

### Default JSON Schema

```json
{
  "negativeStockAllowed": false,
  "autoNormalizeUnits": true,
  "inventorySnapshotFrequency": "REALTIME",
  "lowStockThreshold": 10,
  "lowStockAlertEnabled": true,
  "showOnlyActiveProducts": true
}
```

---

## 🔗 Settings Access Layer

The database settings are fetched and wrapped via a server-side helper file:
* File: `src/lib/settings/inventorySettings.js`
* Function: `getInventorySettings()`

To fetch or update settings via server components and UI forms, use these server actions in `src/modules/settings/controllers/settingsActions.js`:
- `getInventorySettingsAction()`
- `saveInventorySettingsAction(settings)`

---

## 🧭 Setting Boundaries & Scope

Each config toggle is strictly isolated to its respective domain:

| Config Key | Purpose / Used In | Boundary Constraint |
|---|---|---|
| `negativeStockAllowed` | Validation layer when checking physical warehouse quantities on new transactions. | Must never mutate historical intake/sales stock sheets. |
| `autoNormalizeUnits` | Governs automated unit normalization mapping using helpers inside `src/lib/units.js`. | Reuses `units.js` mappings directly. Must not replicate conversion logic. |
| `inventorySnapshotFrequency` | Dashboard caching, live widgets refresh, and background data synchronization rates. | Used strictly as UI update intervals. |
| `lowStockThreshold` | UI badge warnings on inventory list and dashboards for product groups. | Informational alert badge only. |
| `lowStockAlertEnabled` | Controls the visibility of low stock alerts. | Informational toggle. |
| `showOnlyActiveProducts` | Filters active products in transaction select inputs. | UI drop-down filter only. Inactive records remain searchable in historical filters. |

---

## 🧠 Code Reuse Rules

When implementing or extending behaviors related to settings, you **must** reuse existing modules:
1. **Unit Conversions**: Reuse `src/lib/units.js` conversions only. Do not duplicate conversion rates or logic.
2. **Stock Calculations**: Use the existing `InventoryService` for stock calculations. Do not create new stock engine functions.
3. **Product Filtering**: Use the existing `ProductService` for fetching and filtering products.
4. **Rounding**: Always delegate formatting and rounding to the central system formatter `src/lib/formatters/financialFormatter.js` wrapping the core `round` helper from `src/lib/financial.js`.
