# Keyboard Flow System — Phase 2 Integration Guide

This document covers integration patterns implemented during Phase 2 of the Keyboard Flow System in the Intake and Sales forms.

---

## 1. Ref Merging Pattern

When integrating `useKeyboardFlow` into forms where elements already have React `useRef` assignments (e.g. for focus resets or manual element references), you must merge the React ref and the keyboard flow ref callback.

We use a simple `mergeRefs` helper defined inside the form file:

```javascript
const mergeRefs = (...refs) => (el) => {
  refs.forEach((ref) => {
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  });
};
```

### Usage:
```jsx
<select
  ref={mergeRefs(supplierRef, registerField("partyId"))}
  id="partyId"
  ...
/>
```

---

## 2. Dynamic Field Navigation for Multi-Item Lists

In forms like `SaleForm.js`, users can add multiple items dynamically. We dynamically compile the `fields` array based on the list length, giving each field a unique, addressable name.

### Field Mapping Design:
```javascript
const saleFields = useMemo(() => {
  if (initialData) return []; // Skip in edit mode
  
  const fields = [
    { name: "partyId", next: items.length > 0 ? "item-0-productId" : "notes", prev: null },
  ];
  
  items.forEach((_, i) => {
    const nextProductId = i < items.length - 1 ? `item-${i + 1}-productId` : "notes";
    fields.push({ name: `item-${i}-productId`, next: `item-${i}-weight`, prev: i === 0 ? "partyId" : `item-${i - 1}-rate` });
    fields.push({ name: `item-${i}-weight`, next: `item-${i}-rate`, prev: `item-${i}-productId` });
    fields.push({ name: `item-${i}-rate`, next: nextProductId, prev: `item-${i}-weight` });
  });
  
  fields.push({ name: "notes", next: null, prev: items.length > 0 ? `item-${items.length - 1}-rate` : "partyId" });
  return fields;
}, [items.length, initialData]);
```

Each input is then registered dynamically:
```jsx
<select ref={registerField(`item-${index}-productId`)} />
<input ref={registerField(`item-${index}-weight`)} />
<input ref={registerField(`item-${index}-rate`)} />
```

---

## 3. Keyboard Flow Override for Last Row Rate (Multi-Line Appends)

To allow operators to press `Enter` on the last item's rate field and automatically append a new item row instead of moving to the "Notes" section:
1. Intercept `KeyDown` event on the last field row.
2. Verify it's a bare `Enter` key (no `Shift`, `Ctrl`, or `Meta` modifiers).
3. Prevent default behavior and stop event propagation so the parent `KeyboardFlowManager` does not trigger the "Next Field" transition.
4. Append a new item to state, and focus the new row's product select inside a `requestAnimationFrame` callback.

### Custom Event Handler:
```javascript
const handleLastRateKeyDown = useCallback((e, index) => {
  if (
    e.key === "Enter" &&
    !e.shiftKey &&
    !e.ctrlKey &&
    !e.metaKey &&
    index === items.length - 1 &&
    items[index]?.rate
  ) {
    e.preventDefault();
    e.stopPropagation(); // Block parent / manager from capturing the keypress
    addItem();
    
    // Focus the new row product select
    requestAnimationFrame(() => {
      document.querySelector(`[data-field="item-${index + 1}-productId"]`)?.focus();
    });
  }
}, [items]);
```

---

## 4. Reset & Retain Strategies (Save & Add Another)

To ensure consistent behavior, we implement the following form reset & retain behaviors for the "Save & Add Another" flow:

### Intake Form:
- **Keep**: `partyId` (Supplier), `productId` (Product)
- **Clear**: `grossWeight`, `bagCount`, `notes`
- **Focus**: `grossWeight` (ready for the next weight entry)

### Sales Form:
- **Keep**: `partyId` (Buyer)
- **Clear**: `items` (resets to a single empty item), `adjustments`, `notes`
- **Focus**: `item-0-productId` (ready to enter the first product)
