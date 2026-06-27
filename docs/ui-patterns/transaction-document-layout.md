# Transaction Document Layout Pattern

This document describes the architecture, component decomposition, and guidelines for the **Transaction Document Layout** pattern, introduced to modularize invoice-style interfaces (e.g. Purchases, Sales, POS Billing) in a Next.js App Router context.

---

## 1. Design Philosophy & State Boundary

To prevent state synchronization bugs and preserve strict separation of concerns, the pattern enforces a **pure, presentation-only view layer** and consolidates all state inside a single **Page-Level Controller**.

```
+-----------------------------------------------------------+
|               Page Controller (React State)               |
|  - Raw form state (header, row items, settlement)         |
|  - Derived total math (useMemo + @/lib/units)             |
|  - Focus traversal / keyboard event navigation handlers   |
|  - Validation & server action save submissions            |
+-----------------------------------------------------------+
                              |
                     (Feeds props down)
                              v
+-----------------------------------------------------------+
|             DocumentLayout (Grid Structure)               |
|                                                           |
|   +-------------------+          +---------------------+  |
|   |  DocumentHeader   |          |    DocumentTotals   |  |
|   +-------------------+          +---------------------+  |
|                                                           |
|   +----------------------------------------------------+  |
|   |  DocumentItemsGrid (Editable table rows)           |  |
|   +----------------------------------------------------+  |
|                                                           |
|   +-------------------+          +---------------------+  |
|   | DocumentSettlement|          |   DocumentActions   |  |
|   +-------------------+          +---------------------+  |
+-----------------------------------------------------------+
```

### Component Directory Structure
All components are located under:
*   Layout Shell: `src/components/DocumentLayout.js`
*   Modular Items: `src/components/ui/document-editor/`
    *   `DocumentHeader.js`
    *   `DocumentItemsGrid.js`
    *   `DocumentTotals.js`
    *   `DocumentSettlement.js`
    *   `DocumentActions.js`

---

## 2. Component Responsibilities

### A. DocumentLayout (Shell Composer)
Combines the five modular units into a cohesive grid. 
*   **Props**: Passes through all individual sub-component properties.
*   **Responsibility**: Defines the visual layout framework and responsive container breakpoints.

### B. DocumentHeader (Metadata Input)
Captures document level metadata.
*   **Fields**: Supplier/Buyer search dropdown (`SearchableSelect`), entry date picker, reference/invoice numbers, and text remarks.
*   **Responsibility**: Emits updates to parent via `onHeaderChange`.

### C. DocumentItemsGrid (Navigable Entry Grid)
An editable tabular list of lines.
*   **Fields**: Product selector, quantity/weight, quantity unit dropdown, rate, rate unit dropdown, and amount.
*   **Responsibility**: Emits row-level changes (`onCellChange`), keys (`onKeyDown`), additions (`onAddRow`), and deletions (`onDeleteRow`).

### D. DocumentTotals (Financial Summary)
Displays read-only financial totals.
*   **Fields**: Base Subtotal, Adjustments Total, Grand total.
*   **Responsibility**: Displays derived figures (no internal state).

### E. DocumentSettlement (Payment Control)
Collects payment details.
*   **Fields**: Amount Paid, Payment Method selector, and Payment Status (Unpaid, Partial, Paid).
*   **Responsibility**: Emits updates via `onSettlementChange`.

### F. DocumentActions (Form Submission)
Form trigger actions.
*   **Fields**: Save button (with loading spinner state), Cancel button.
*   **Responsibility**: Invokes `onSave` or `onCancel` callbacks.

---

## 3. Strict Architectural Rules

When using or extending this pattern, you must follow these invariants:

1.  **State Isolation**: Shared presentation components MUST remain pure. Do not import services, fetch database queries, or write to local storage inside them.
2.  **Derived Math**: Subtotals and totals must never be saved in component state. Derive totals dynamically using `useMemo` in the parent controller based on the current `items` array.
3.  **Core Units Precision**: All scale conversions (e.g. Maund to Kilogram conversions) must run in the parent controller through `@/lib/units.js` handlers (`normalizeQuantity`, `normalizeRate`).
4.  **Presentation-Only Formatting**: Use `formatCurrency` from `@/lib/formatters/financialFormatter` for display formatting. Never store pre-formatted currency string values in calculation states or database records.

---

## 4. Keyboard Traversal Reference

Keyboard traversal allows fast row-to-row and cell-to-cell traversal using Arrow keys and `Enter`. Focus elements are identified via a predictable ID schema:
*   Product Dropdowns: `cell-{index}-productId`
*   Quantity/Weight Inputs: `cell-{index}-weight`
*   Quantity Unit Dropdowns: `cell-{index}-unit`
*   Rate Inputs: `cell-{index}-rate`

The controller implements `onKeyDown` to shift focus accordingly:

```javascript
const handleKeyDown = (index, field, e, isOpen) => {
  if (isOpen) return; // Allow searchable dropdowns to handle standard selections first

  const focusCell = (targetIndex, targetField) => {
    const inputId = targetField === "productId"
      ? `cell-${targetIndex}-productId`
      : `cell-${targetIndex}-${targetField}`;
    const el = document.getElementById(inputId);
    if (el) {
      el.focus();
      if (el.select) el.select();
      return true;
    }
    return false;
  };

  if (e.key === "ArrowDown") {
    e.preventDefault();
    focusCell(index + 1, field);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    focusCell(index - 1, field);
  } else if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (field === "productId") focusCell(index, "weight");
    else if (field === "weight") focusCell(index, "unit");
    else if (field === "unit") focusCell(index, "rate");
    else if (field === "rate") {
      if (index === items.length - 1) {
        handleAddRow();
        setTimeout(() => focusCell(index + 1, "productId"), 50);
      } else {
        focusCell(index + 1, "productId");
      }
    }
  }
};
```

---

## 5. How to reuse the pattern (e.g. Sales Invoices)

To implement a new transaction style (like Sales) with the layout:

1.  **Create Client Controller**: E.g. `src/app/sales/create/SaleCreateClient.js`
2.  **Define state blocks**: Initialize states for header fields, lines array, and settlement.
3.  **Compute derived totals**:
    ```javascript
    const derivedTotals = useMemo(() => {
      const baseSubtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      return { baseAmount: baseSubtotal, adjustmentsTotal: 0, grandTotal: baseSubtotal };
    }, [items]);
    ```
4.  **Render layout**: Feed all props to `<DocumentLayout>`:
    ```javascript
    import DocumentLayout from "@/components/DocumentLayout";
    
    return (
      <DocumentLayout
        headerValues={headerValues}
        onHeaderChange={setHeader}
        parties={buyers}
        partyLabel="Customer (Party)"
        items={items}
        products={products}
        onCellChange={handleCellChange}
        onKeyDown={handleKeyDown}
        baseAmount={derivedTotals.baseAmount}
        grandTotal={derivedTotals.grandTotal}
        settlementValues={settlement}
        onSettlementChange={setSettlement}
        onSave={saveInvoice}
      />
    );
    ```
