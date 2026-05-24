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
