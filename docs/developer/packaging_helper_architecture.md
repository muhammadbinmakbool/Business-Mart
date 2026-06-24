# Packaging Helper Architecture

This document outlines the architecture, data model, and implementation guidelines for the **Packaging Helper Layer** in Business Mart.

## 🎯 Objective

The Packaging Helper Layer is a UI convenience system designed to preserve the business context of how transactions (Intakes and Sales) were originally entered (e.g., in bags, crates, boxes, or bundles) without coupling these entry concepts to the core inventory, unit, or financial calculation engines.

---

## 🚨 Architectural Boundary Rules (IMMUTABLE)

1. **Calculation Integrity**: Under no circumstances should any field in `packagingMeta` participate in inventory ledger calculations, stock balances, maunds-to-kilograms conversions, unit conversion math, or financial billing calculations.
   * **The Sole Source of Truth** for calculations remains `baseQuantity` (computed purely using standard unit conversion factors).
2. **UI Autonomy**: The helper is an opt-in frontend convenience. The transaction forms and APIs must remain fully functional and able to accept raw weights/units even if the helper is not used or if `packagingMeta` is empty.
3. **No Dynamic Unit Contamination**: Do not register packaging terms (like `Bag`, `Pack`, `Box`, `Crate`) in the core `UnitService` or database unit registry. These are text metadata fields, not unit definitions.

---

## 🧱 Data Model Extension

A single JSON field `packagingMeta` has been added to the following database models:

### `IntakeTransaction`
```prisma
packagingMeta Json?
```

### `SaleItem`
```prisma
packagingMeta Json?
```

---

## 📦 JSON Schema Structure

The structure of the `packagingMeta` JSON object is defined as:

```typescript
interface PackagingMeta {
  type: string;        // e.g., "Bag", "Box", "Crate", "Bundle"
  count: number;       // e.g., 10 (quantity of physical packages)
  sizePerUnit: number; // e.g., 50 (mass or capacity per package)
  unitLabel: string;   // e.g., "KG", "LITER" (the standard unit of sizePerUnit)
}
```

*Example:*
```json
{
  "type": "Bag",
  "count": 10,
  "sizePerUnit": 50,
  "unitLabel": "KG"
}
```

---

## 💻 UI Interaction Flow

1. **Checkbox Activation**: Users check a **"Helper"** toggle under the Weight field.
2. **Formula Calculation**: When checked, `helperQuantity` and `helperSizePerUnit` inputs are displayed. The UI auto-calculates:
   $$\text{Weight} = \text{helperQuantity} \times \text{helperSizePerUnit}$$
3. **Readonly Weight**: The standard weight field becomes read-only when the helper is active to prevent synchronization issues.
4. **Serialization**: During submission, if the helper was active and fields are filled, the data is serialized into the `packagingMeta` JSON payload.

---

## 👁️ Rendering & Presentation

When displaying transactional details (e.g., in intake detail pages or sale detail pages):
* If `packagingMeta` is present, it is parsed and rendered in a human-readable string:
  `"{count} {type}s × {sizePerUnit} {unitLabel}"` (e.g., `10 Bags × 50 KG`).
* If not present, the UI falls back gracefully to standard weight and unit labels.
