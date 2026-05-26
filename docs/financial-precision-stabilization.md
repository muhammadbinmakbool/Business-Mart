# Business-Mart Developer Guide: Financial Engine Precision & Display Architecture

This document outlines the architectural guidelines, core files, and rules governing financial calculations, precision handling, and unit formatting in Business Mart.

---

## 🎯 Core Goal

The system maintains **strict infinite-precision internally** throughout all mathematical pipelines (conversions, adjustments, deductions, and base amounts) and delegates rounding or display formatting exclusively to the **final output boundaries** (UI details pages, settlement PDF sheets, and reports).

This design completely eliminates numerical drift and conversion errors across modules.

---

## 1. Directory Structure & File Roles

```
src/
├── lib/
│   ├── financial.js       # PURE Calculation Engine (NEVER performs rounding)
│   ├── precision.js       # Boundary Precision Layer (Handles display/output rounding)
│   └── display-units.js   # UI Display formatting helpers (e.g. formatMaundWeight)
├── print/
│   └── localization/
│       └── formatters.js  # Print/PDF formatting helpers (e.g. formatWeight)
```

---

## 2. Core Components

### A. The Pure Calculation Engine (`src/lib/financial.js`)

`financial.js` acts strictly as a **deterministic mathematical engine**. Its responsibilities are limited to:
* Converting values (weight, quantity, rates)
* Computing adjustment values
* Aggregating base and adjustment totals

#### 🚨 Safety Warning Lock:
Every calculation function inside `financial.js` must return raw, high-precision floating-point numbers. No internal rounding is allowed.

```javascript
// WARNING:
// This file must NEVER perform rounding.
// Rounding is handled ONLY in precision layer at output boundary.
```

#### Guidelines for `financial.js`:
* **Do NOT use `round()` inside loops** or on intermediate values.
* **All calculator returns** (e.g. `calculateAdjustment`, `calculateFinalTotal`, `calculateTransactionTotals`, `calculateSupplierDeductions`) must yield unrounded values.
* The legacy `round` utility is kept strictly as a compatibility wrapper for downstream clients, but is **never** invoked within any calculation.

---

### B. The Boundary Precision Layer (`src/lib/precision.js`)

Output-stage rounding is delegated entirely to the boundary layer using the `Precision.final(value)` helper.

```javascript
import { Precision } from "@/lib/precision";

// Rounds strictly at the final output boundary
const finalPayable = Precision.final(rawAmount); // Returns rounded integer
```

#### Rules for Output Rounding:
1. **Integer Only**: Final rounding rounds to `0` decimal places.
2. **KG & Currency Only**: Only KG-based weights and monetary totals can undergo final rounding.
3. **Maund & Product Units**: Non-KG units (e.g. **MAUND**, **BAG**) **MUST NEVER be rounded**, keeping their full mathematical precision intact for reports.

---

### C. Display Unit Formatting Helpers

When weights are displayed in **Maund (MND)**, decimals should not be shown. Instead, fractional Maunds are converted into the corresponding **Kg** remainder (where `1 Maund = 40 Kg`). 

For example: **`40.5 Maund`** should be rendered as **`40 Maund 20 Kg`** (or `40 MND 20 KG`).

#### 1. In UI Detail Templates (`src/lib/display-units.js`)
Use the reusable `formatMaundWeight` presentational helper:

```javascript
import { formatMaundWeight } from "@/lib/display-units";

// Returns "40 MND 20 KG"
const weightLabel = formatMaundWeight(40.5, "MND", "KG");
```

#### 2. In Print/PDF Localization Formatter (`src/print/localization/formatters.js`)
The `formatWeight` utility automatically handles fractional Maund decomposition for both English and Urdu locales:

```javascript
import { formatWeight } from "../localization/formatters";

// English: "40 MND 20 KG"
formatWeight(40.5, "MAUND", "en");

// Urdu: "40 من 20 کلو"
formatWeight(40.5, "MAUND", "ur");
```

---

## 3. Reference Workflow Spec

```mermaid
graph TD
    A[Inputs: Raw Rate, Unit, Weight] --> B(financial.js: Raw Calculations)
    B --> C{Output Boundary?}
    C -->|No: Next step / intermediate| B
    C -->|Yes: Render UI / Settlement| D(display-units.js / formatters.js)
    D --> E[Formated Whole Maund + Kg / Rounded Integer Output]
```
### Example Usage:
```javascript
import { calculateTransactionTotals } from "@/lib/financial";
import { Precision } from "@/lib/precision";

// 1. Calculate raw transaction values using the pure engine
const rawTotals = calculateTransactionTotals(items, adjustments);

// 2. Round at UI / display boundary
const displayFinalAmount = Precision.final(rawTotals.finalAmount);
const displayTotalWeightInKg = Precision.final(rawTotals.totalWeight);