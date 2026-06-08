# Invoice Adjustments Visibility Settings Developer Guide

This document details the architectural layout, implementation details, and database schema for the **Invoice Adjustment Visibility Control** settings. This guide serves as a technical reference for developers maintaining or extending the system settings module.

---

## 1. Core Architecture & Design Rules

The visibility settings system acts strictly as an input and presentation-layer filter:
- **Presentation-Only Filtering**: Disabling a billing adjustment type prevents it from appearing as an option in the *Add Adjustment* dropdowns during invoice creation or editing.
- **Historical Integrity**: A disabled adjustment type is **never** removed or filtered from already saved/historical records. If an invoice in the database contains an adjustment of a disabled type, it is still displayed in invoice details, summaries, and print templates.
- **Total Calculation Invariant**: No mathematical or database mutations are applied to base totals or transactions. Hiding a setting changes visibility in dropdown forms only.

---

## 2. Directory and File Structure

The implementation is modularized across the settings, sales, supplier-invoices, and shared library layers:

```
docs/settings/
└── adjustments-visibility-control.md       # Technical documentation (this file)
prisma/
└── schema.prisma                           # SystemSetting database model
src/
├── app/
│   ├── sales/
│   │   ├── [id]/edit/page.js               # Load settings on server and pass to SaleForm
│   │   └── create/
│   │       ├── page.js                     # Load settings on server and pass to SaleForm
│   │       └── SaleForm.js                 # Filter adjustment dropdown based on settings
│   ├── settings/
│   │   ├── AdjustmentVisibilityCard.js     # Admin UI toggles for buyer and supplier adjustments
│   │   └── page.js                         # Registered Adjustments Visibility settings tab
│   └── supplier-invoices/
│       ├── [id]/edit/page.js               # Load settings on server and pass to InvoiceGenerator
│       └── create/
│           ├── page.js                     # Load settings on server and pass to InvoiceGenerator
│           └── InvoiceGenerator.js         # Filter adjustment dropdown based on settings
├── lib/
│   └── settings/
│       └── adjustmentsVisibility.js        # Core helper functions (shouldShow/getVisible)
└── modules/
    └── settings/
        └── controllers/
            └── settingsActions.js          # Next.js Server Actions: load / save settings
```

---

## 3. Database Schema

Visibility settings are stored as stringified JSON blobs in the `SystemSetting` table.

```prisma
model SystemSetting {
  id        Int      @id @default(autoincrement())
  key       String   @unique          // e.g. "adjustment_visibility"
  value     String   @db.NVarChar(Max) // JSON payload
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### JSON Schema Structure
The `value` field stores a JSON string formatted as follows:
```json
{
  "adjustmentVisibility": {
    "Commission": true,
    "Labour": false,
    "Rent": true,
    "Kaat": true
  }
}
```
*Note: Any adjustment type not explicitly defined in the map defaults to `true` (visible).*

---

## 4. Centralized Helper API (`src/lib/settings/adjustmentsVisibility.js`)

Consistent filtering logic is achieved through two lightweight, unit-tested functions:

### 4.1 `shouldShowAdjustment`
Determines if a specific adjustment type is active.
```javascript
export function shouldShowAdjustment(type, settings) {
  if (!settings || !settings.adjustmentVisibility) return true;
  const visibilityMap = settings.adjustmentVisibility;
  return visibilityMap[type] !== false;
}
```

### 4.2 `getVisibleAdjustments`
Filters an array of allowed adjustment type strings.
```javascript
export function getVisibleAdjustments(allTypes = [], settings = null) {
  return allTypes.filter(type => shouldShowAdjustment(type, settings));
}
```

---

## 5. Next.js Server Actions (`src/modules/settings/controllers/settingsActions.js`)

Persisting preferences to and from SQL Server uses Server Actions:
- `getAdjustmentVisibilityAction()`: Resolves current settings. If no setting exists, it initializes and returns a default schema where all known constants are enabled (`true`).
- `saveAdjustmentVisibilityAction(payload)`: Merges new toggle changes and saves the resulting JSON object back to the database.

---

## 6. Frontend Integration Details

### 6.1 Settings Administration UI
Administrators manage visibility in the Settings dashboard under the "Adjustments Visibility" tab:
1. `AdjustmentVisibilityCard.js` renders two lists of switches: **Buyer Adjustments** (using `ADJUSTMENT_TYPES_BUYER`) and **Supplier Adjustments** (using `ADJUSTMENT_TYPES_SUPPLIER`).
2. Changes are immediately updated in local component state.
3. Clicking **Save Settings** triggers `saveAdjustmentVisibilityAction` and displays a feedback toast.

### 6.2 Invoice & Settlement Creation Forms
To enforce these filters:
1. Server Components under `sales` and `supplier-invoices` fetch the active visibility mapping.
2. The settings are passed as a prop to `SaleForm` and `InvoiceGenerator`.
3. The component filters the local options mapping dynamically using the helper functions:
   ```javascript
   const visibleAdjustmentTypes = getVisibleAdjustments(ADJUSTMENT_TYPES_SUPPLIER, settings);
   ```
4. The dropdown selectors render only `visibleAdjustmentTypes`, preventing users from introducing disabled billing charges onto new transactions.

### 6.3 Ledger, Settlement & Report Views
To maintain a single source of truth across all modules, ledger summaries and settlement reports also query the same `adjustments_visibility` settings:
1. The ledger page loads the visibility mappings on the server and passes them down.
2. The client UI dynamically hides or displays corresponding adjustment columns (Commission, Labour, Rent, Kaat) in ledger matching lists and print templates.
3. This prevents layout clutter and ensures disabled adjustment types are not displayed in active ledger reporting tables.

