# Keyboard Flow System — Phase 3: Smart Defaults & Memory Store

This document covers the implementation of smart defaults and context memory added during Phase 3 of the Fast Entry System.

---

## 1. Smart Memory Store

The memory store (`src/lib/fastEntryMemoryStore.js`) is a lightweight client-side key-value layer utilizing the browser's `localStorage` to persist values.

### Storage Layout:
All items are stored under a single partitioned key namespace with structure `${context}:${key}`:
- `intake:lastSupplier` -> Last supplier party ID
- `intake:lastProduct` -> Last product ID
- `intake:lastUnit` -> Last unit ID
- `sales:lastBuyer` -> Last buyer party ID
- `sales:lastProduct` -> Last product ID
- `sales:lastRate` -> Last rate value
- `sales:lastUnit` -> Last unit ID

### Storage Lifecycle Rule:
Memory values are **ONLY** set when a transaction is saved successfully. They are never written on keypress, field change, or focus navigation to prevent dirty values from corrupting suggestions.

---

## 2. Prefill / Autofill Suggestion Rules

### Intake Suggestions:
- **Supplier select**: If empty, suggestions lookup `intake:lastSupplier`.
- **Product select**: If empty, suggestions lookup `intake:lastProduct`.
- **Unit select**: If empty, suggestions lookup `intake:lastUnit`.

### Sales Suggestions:
- **Buyer select**: If empty, suggestions lookup `sales:lastBuyer`.
- **Row Product select**:
  - If `index > 0`: Suggests product ID of the previous row (`items[index - 1].productId`).
  - If `index === 0`: Suggests `sales:lastProduct`.
- **Row Unit select**:
  - If `index > 0`: Suggests unit ID of the previous row.
  - If `index === 0`: Suggests `sales:lastUnit`.
- **Row Rate input**:
  - If `index > 0`: Suggests rate value of the previous row.
  - If `index === 0`: Suggests `sales:lastRate`.

---

## 3. Visual Helper Style & Interactions

We follow a strict non-intrusive suggestion pattern using **helper buttons/labels below dropdowns and input fields**:
1. Suggestions **never** overwrite user input.
2. Clicking a suggestion applies it **only** if the target field is currently empty.
3. Suggestion controls disappear automatically as soon as the target field has any value selected or typed.

### Component Code Pattern (React):
```jsx
{suggestedItem && !value && (
  <button
    type="button"
    onClick={() => applySuggestion(suggestedItem.id)}
    className="text-xs text-primary/80 hover:text-primary underline mt-1 block text-left"
  >
    Suggested: {suggestedItem.name} (Click to apply)
  </button>
)}
```
