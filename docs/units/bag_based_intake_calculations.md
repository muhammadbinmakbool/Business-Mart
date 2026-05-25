# Product-Specific BAG Intake Calculations & Registry Integration

This document outlines the architecture, calculations, and visual presentation layers developed to handle **BAG**-based measurement units during the Goods Intake flow. It covers reactive input states, automatic calculation conversions, hidden-field submissions, and the clean separation of database normalization from presentation.

---

## 1. Background & Objective

Products in **Business Mart** can be categorized by weight, liquid, or quantity. Some quantity-based or weight-based products possess a product-specific **Bag Size** (defined under `unitConversion` in the `Product` model, e.g., 20 KG for a Basmati Rice bag).

During Goods Intake, operators can record transactions in three units:
1. **Kilograms (KG)** — Standard physical base weight.
2. **Maunds (MAUND)** — Standard physical weight unit equal to 40 KG.
3. **Bags (BAG)** — A product-specific unit where the conversion factor is equal to the product's bag weight.

To prevent runtime conversion crashes (e.g. `MISSING_CONVERSION` errors) and ensure a seamless, error-free recording experience, we implemented a dual reactive flow that automatically calculates missing variables using the **Centralized Unit Registry** (`src/lib/units.js`).

---

## 2. Centralized Registry Integration (No Hardcoding)

All calculations in forms, list tables, and detail screens are entirely registry-driven. Component-level hardcoding (such as `* 40` or `/ 20`) is strictly avoided. The registry provides two primary functions:

- `normalizeQuantity(value, unitId, product)`: Converts any quantity in a local unit (`BAG`, `MAUND`) into the physical base unit (`KG`).
- `convertFromBase(baseValue, targetUnitId, product)`: Converts a quantity from the physical base unit (`KG`) to the target local unit.

---

## 3. Dual Reactive Calculation Modes in Forms

The Intake Forms (`IntakeForm.js` and `EditIntakeForm.js`) operate in one of two dynamic modes based on the active **Measurement Unit** selection:

### Mode A: Physical Unit Selected (`KG` or `MAUND`)
When the selected unit is a standard physical weight unit, the operator enters the **Gross Weight** value directly. The **Bag Count** is automatically calculated and locked to read-only:

1. **User input**: Operator enters `Gross Weight` (e.g., `400` KG).
2. **Reactivity**: 
   - Normalizes the input weight to physical base KG:
     ```javascript
     const weightInKg = normalizeQuantity(val, selectedUnit, selectedProduct);
     ```
   - Converts the base weight to the product-specific `"BAG"` unit:
     ```javascript
     const bags = convertFromBase(weightInKg, "BAG", selectedProduct);
     ```
   - **Ceiling Rounding Strategy (Exclusive UI Rule)**:
     To ensure inventory accuracy and operational reliability, the system rounds up to the next full bag using the **ceiling method (`Math.ceil`)** rather than standard rounding:
     ```javascript
     setBagCountVal(Math.ceil(bags).toString());
     ```
     > [!IMPORTANT]
     > This is the **only place in the entire application** where the ceiling method is applied to bag count calculations.
     > **Rationale**: If the physical weight exceeds a bag boundary even by a fraction (e.g. `25 KG` on a product with a `20 KG` bag size = `1.25 bags`), it requires a minimum of **2 physical bags** (1 full bag of `20 KG` and a secondary partially filled bag of `5 KG`). For gross logistics and packaging tracking, this is counted as **2 bags**.
3. **Input Lock**: The `Bag Count` input is marked as `readOnly={true}`.

---

### Mode B: Product-Specific Unit Selected (`BAG`)
When `"BAG"` is selected as the unit, the **Gross Weight** input is locked to read-only, and the operator enters the **Bag Count** manually:

1. **User input**: Operator enters **Bag Count** (e.g., `20` bags).
2. **Reactivity**:
   - The visible `grossWeight` field automatically displays the calculated weight in the unit defined for the Product Bag (KG) using the registry helper:
     ```javascript
     const calculatedWeight = normalizeQuantity(bagCountVal, "BAG", selectedProduct);
     ```
   - This value is rendered inside a read-only input field (`grossWeight_display`) so the operator sees the correct physical weight (`400.00` KG).
3. **Hidden-Field Submission Architecture**:
   - In the database schema, the internal normalized math assumes that if `unit = "BAG"`, the submitted `grossWeight` represents the number of bags (which is then multiplied by `unitConversion` in the backend).
   - To submit the correct value to the database without breaking standard reconciliation or ledgers, the visible input field is decoupled from the actual form submittal:
     ```jsx
     {/* Visible display input */}
     <input
       id="grossWeight_display"
       type="text"
       readOnly
       value={normalizeQuantity(bagCount, "BAG", selectedProduct).toFixed(2)}
     />
     {/* Hidden input containing the raw bags count submitted to the controller */}
     <input
       type="hidden"
       name="grossWeight"
       value={grossWeight} // Stored as the bagCount
     />
     ```
   - This prevents double-conversion bugs in the backend and guarantees absolute data purity.

---

## 4. Normalized Data Layout in Views

To maintain visual excellence and avoid confusing the operator with mixed bag/weight numbers in historical summaries, we display normalized physical weights directly in views:

### Intake Listing Table (`IntakeListClient.js`)
- **Gross Weight Column**: Displays the clean physical weight in `KG` (derived from the database computed `normalizedWeight` field) instead of displaying the raw bag count:
  ```javascript
  {intake.unit === "BAG" ? (
    <>{Number(intake.normalizedWeight).toLocaleString()} KG</>
  ) : (
    <>{Number(intake.grossWeight).toLocaleString()} {intake.unit}</>
  )}
  ```
- **Bags Column**: Displays the clean, dedicated bag count (`intake.bagCount || "-"`) next to the weight as expected in normal flows.
- **Net Weight Column**: Automatically renders the net weight in physical `KG` using the unified registry conversion:
  ```javascript
  {intake.unit === "BAG" && intake.product ? (
    <>{normalizeQuantity(intake.netWeight, "BAG", intake.product).toLocaleString()} KG</>
  ) : (
    <>{Number(intake.netWeight).toLocaleString()} {intake.unit}</>
  )}
  ```

### Intake Detail Screen (`[id]/page.js`)
The detailed transaction display cards follow the exact same visual design rules, presenting clean physical weight values in `KG` under Gross Weight and Net Weight headings for any `"BAG"` unit intake.
