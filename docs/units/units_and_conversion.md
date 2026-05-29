# Units & Conversion System

This document outlines the architecture, registration, and conversion mechanics of the Units subsystem in Business Mart.

## 1. Registry Configuration (`UNITS`)

Units are registered within `src/lib/units.js`. Each unit is assigned a category, a translation key/name, and a mathematical factor relative to the category's baseline.

```javascript
export const UNITS = {
  // WEIGHT CATEGORY
  KG: { 
    id: "KG", 
    name: "Kilogram", 
    category: UNIT_CATEGORIES.WEIGHT, 
    base: true, 
    factor: 1 
  },
  MAUND: { 
    id: "MAUND", 
    name: "Maund", 
    category: UNIT_CATEGORIES.WEIGHT, 
    factor: 40 
  },
  ...
};
```

---

## 2. Base Unit Configuration (`BASE_UNITS`)

The `BASE_UNITS` constant maps each category to its default primary unit of measure:

```javascript
export const BASE_UNITS = {
  [UNIT_CATEGORIES.WEIGHT]: "KG",
  [UNIT_CATEGORIES.LIQUID]: "ML",
  [UNIT_CATEGORIES.QUANTITY]: "PIECE",
};
```

### Purpose of `BASE_UNITS`
1. **Form & UI Defaults**: When creating or editing products, selecting a category (e.g., `WEIGHT`) automatically switches the product's primary unit selection to the mapped base unit (e.g. `KG`).
2. **Standard Mappings**: Exposes the standard base unit for categories downstream (via `UnitService.getBaseUnit(category)`) to determine the target base unit when normalizing numbers.

### Effects of Changing a Base Unit Value
If you modify a category's base unit (for example, setting the weight category's base unit from `"KG"` to `"MAUND"`):

1. **Default Unit Re-assignment**: Switch category actions during product creation/editing will default primary unit fields to the new unit identifier (e.g., `MAUND` instead of `KG`).
2. **Mathematical Mismatches (Crucial)**: 
   - Calculations (normalization, rate computation) evaluate conversions using the unit `factor` defined in the registry relative to the entry with `factor: 1`.
   - If `BASE_UNITS[WEIGHT]` is set to `"MAUND"`, but `"MAUND"` still has `factor: 40` in the `UNITS` registry, mathematical operations will continue to normalize inputs using `KG` (which retains `factor: 1`) as the reference baseline. This mismatch causes drift and calculation errors.

> [!WARNING]
> **Co-dependency Rule**: If you change a category's base unit in `BASE_UNITS`, you **must** update the corresponding unit registry definitions in `UNITS` so that:
> - The new base unit has `factor: 1`.
> - All other units in the same category have their factors scaled relative to the new base unit.

---

## 3. Centralized Unit Identifiers (`UNIT_IDS`)

To eliminate magic string duplication and hardcoded bugs, all structural code references to unit identifiers must consume the type-safe `UNIT_IDS` constant defined in `src/lib/units.js`:

```javascript
export const UNIT_IDS = {
  KG: "KG",
  MAUND: "MAUND",
  BAG: "BAG",
  // ...other registered units
};
```

Developers must NEVER use raw strings like `"MAUND"`, `"MND"`, or `"KG"` in listing/detail views, database controllers, schema definitions, print subsystems, or service layers. Instead, import `UNIT_IDS` or use the localized formatting helpers:
- **Presentation Display**: Use `getUnitLabel(unitCode)` to render human-readable local representations.
- **Calculations & Compatibility**: Reference `UNIT_IDS.KG` or `UNIT_IDS.MAUND` directly to verify categories and bounds.

---

## 4. Centralized Fallback Strategy (`DEFAULT_UNIT`)

The registry exports a centralized `DEFAULT_UNIT` identifier to provide single-point configuration for fallback preferences:

```javascript
export const DEFAULT_UNIT = UNIT_IDS.KG;
```

### Fallback Implementation Pattern

Whenever a unit is optional or could evaluate to `null` / `undefined` (e.g. historical inputs, preferences, adjustment rates, or optional schemas), developers must use `DEFAULT_UNIT` as the fallback boundary instead of hardcoding default strings:

```javascript
// [INCORRECT] Hardcoded fallback string
const unit = item.unit || "KG";

// [CORRECT] Single-point configurable default fallback
import { DEFAULT_UNIT } from "@/lib/units";
const unit = item.unit || DEFAULT_UNIT;
```

This ensures that the entire system's default unit behavior can be adjusted globally by modifying a single constant.
