# Default & Market/Season Product Settings Developer Guide

This document details the architectural design, implementation details, database schema, and integrations for the **Default Product Selection** and **Season/Market Product Selection** settings. This guide serves as a technical reference for developers maintaining or extending the system settings module.

---

## 1. Core Architecture & Design Rules

The default and active crop seasonal product settings act strictly as initialization and pre-selection hints:
- **UI-Level Pre-selection Only**: The settings are loaded and used to pre-populate product dropdown fields upon screen initialization.
- **User Override Preservation**: Once initialized, a user's manual selection changes must be preserved. The system must never overwrite user modifications dynamically.
- **Independence from Calculations**: These preferences do not affect database constraints, inventory records, financial calculations, or historical ledgers. They exist purely for data entry efficiency.
- **Priority Pre-selection Rule**: When initializing forms or dashboards, if the `activeMarketProductId` (Current Market Product) is configured, it is selected first. If it is unset, the `productId` (Default Product) is used. If both are unset, the select elements initialize as blank.

---

## 2. Directory and File Structure

The implementation is modularized across settings, products, intake, market-insight, and shared helper layers:

```
docs/settings/
├── adjustments-visibility-control.md       # Technical guide for visibility settings
└── default-product-season-settings.md       # Technical guide for defaults settings (this file)
prisma/
└── schema.prisma                           # SystemSetting database model
src/
├── app/
│   ├── intake/
│   │   └── create/
│   │       ├── page.js                     # Load settings on server and pass to IntakeForm
│   │       └── IntakeForm.js               # Pre-populate product selection based on priority rules
│   ├── market-insight/
│   │   └── dashboard/
│   │       ├── page.js                     # Load settings on server; resolve and apply defaults
│   │       └── MarketInsightDashboardClient.js # Filter dropdown with default and "All" option support
│   └── settings/
│       ├── DefaultsCard.js                 # Admin UI form for managing default & active crop products
│       └── page.js                         # Register Defaults tab navigation and render DefaultsCard
├── components/
│   └── ui/
│       └── ProductSelect.js                # Searchable, keyboard-accessible clearable select dropdown
├── lib/
│   └── settings/
│       └── adjustmentsVisibility.js        # Exposes the centralized settingsService helper
└── modules/
    ├── products/
    │   └── controllers/
    │       └── productActions.js          # Next.js Server Actions: get active products list
    └── settings/
        └── controllers/
            └── settingsActions.js          # Next.js Server Actions: getSettings, updateSettings
```

---

## 3. Database Schema

The default settings are nested within the existing `SystemSetting` table under the `"adjustment_visibility"` key. This design avoids introducing new SQL tables or schema migrations.

```prisma
model SystemSetting {
  id        Int      @id @default(autoincrement())
  key       String   @unique          // e.g. "adjustment_visibility"
  value     String   @db.NVarChar(Max) // JSON payload containing adjustments and defaults
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### JSON Schema Structure
The `value` field stores a unified JSON string structured as follows:
```json
{
  "adjustments": {
    "visibility": {
      "COMMISSION": true,
      "RENT": false,
      "LABOUR": true,
      "KAAT": true
    }
  },
  "defaults": {
    "productId": 2,
    "activeMarketProductId": 4
  }
}
```

---

## 4. Centralized Settings API (`src/lib/settings/adjustmentsVisibility.js`)

A unified `settingsService` is exposed to allow components and server page actions to easily read/write settings.

```javascript
import { getSettings, updateSettings } from "@/modules/settings/controllers/settingsActions";

export const settingsService = {
  getSettings, // Loads and normalizes settings JSON structure
  updateSettings // Performs partial updates on adjustments/defaults keys
};
```

---

## 5. Next.js Server Actions (`src/modules/settings/controllers/settingsActions.js`)

The server-side actions query or update the settings JSON blob:
- `getSettings()`: Reads the JSON blob, parses it, normalizes missing fields, and returns a consistent schema.
- `updateSettings(settings)`: Reads the existing JSON blob, deep-merges changes (either adjustments or defaults), writes the result, and calls `revalidatePath("/settings")`.
- `saveDefaultProductSettingsAction(defaultProductId, activeMarketProductId)`: Legacy/convenience wrapper for updating default preferences.

---

## 6. Frontend Components & Integration Details

### 6.1 `ProductSelect.js` Dropdown Component
- Extends standard input elements to provide dynamic autocomplete filtering.
- Displays indicators for product categories and clear buttons `(X)` for optional fields.
- Provides support for keyboard navigation (Esc, Arrow keys, Enter).

### 6.2 Settings Administration UI
- Toggled under the **Defaults** tab of the `/settings` page.
- Renders `DefaultsCard.js` which lets administrators configure:
  1. **Default Product**: Standard fallback product.
  2. **Current Market Product**: Temporary product selection (takes precedence during active harvest seasons).
- Updates are saved using `saveDefaultProductSettingsAction`.

### 6.3 Intake Creation Form
- `src/app/intake/create/page.js` loads the settings on the server side and forwards them to `IntakeForm.js`.
- On mount, `IntakeForm.js` executes the priority rule to check for `activeMarketProductId`, falling back to `productId`, and programmatically calls `handleProductChange()` to pre-fill the form and set up compatibility unit states.

### 6.4 Market Insight Dashboard
- `src/app/market-insight/dashboard/page.js` resolves the product ID filter on the server side:
  - If no `productId` search parameter is in the URL, it reads the active crop/default product from the settings database.
  - If the user explicitly selects **All Products** in the filter dropdown, the page redirects to `?productId=all`. This bypasses setting defaults, allowing the system to query analytics data for all products.
