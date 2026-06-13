# SearchableSelect Dropdown Component Guide

The `SearchableSelect` component is a highly optimized, searchable, keyboard-navigable custom select input. It is designed to act as a drop-in replacement for native HTML `<select>` elements, offering a superior UX for large lists while preserving compatibility with standard HTML forms (Server Actions, `FormData`).

---

## 🚀 Key Features

1. **Native Form Integration**: Employs a hidden `<input type="hidden">` synced with React state, ensuring native `FormData` submissions continue to work seamlessly.
2. **Keyboard Accessibility**:
   - `ArrowDown` & `ArrowUp`: Navigate highlights.
   - `Enter`: Select the highlighted option (safely prevents default form submission).
   - `Escape`: Close dropdown and return focus to the trigger button.
3. **Smart Match Filtering**:
   - Matches both the `label` and `subLabel`.
   - **Prefix-First Priority**: Items starting with the search query are automatically sorted to the top, followed by substring matches.
   - **Auto-Highlight**: The first match is highlighted automatically as the search query changes.
4. **Conditional Special Options**:
   - Support for special action options (e.g., `➕ Add New Buyer`).
   - A `specialOption` will only be displayed when the search query is empty or explicitly matches a portion of its own label.
5. **Scroll Reset**:
   - The dropdown container automatically resets its scroll position to the top upon opening to prevent "stuck scroll" bugs.
   - Using keyboard arrow keys automatically scrolls the active element into view.

---

## 🛠 Props & API

| Prop | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `options` | `Array` | Yes | Array of `{ value, label, subLabel, specialOption }` |
| `value` | `String` | Yes | Controlled state value matching `value` of selected option |
| `onChange` | `Function` | Yes | Callback function `(value) => void` triggered on selection |
| `name` | `String` | No | Name attribute of the hidden input used for native form submits |
| `placeholder`| `String` | No | Default display text when no value is selected |
| `disabled` | `Boolean`| No | Disables interactions and styling when `true` |
| `required` | `Boolean`| No | Applies `required` validation to the hidden input |
| `id` | `String` | No | Component identifier, forwarded to the focusable button |
| `ref` | `Ref` | No | Forwarded ref bound to the focusable trigger button |

---

## 📝 Usage Example

### Simple Controlled Input
```jsx
import React, { useState } from "react";
import SearchableSelect from "@/components/ui/SearchableSelect";

const products = [
  { id: 1, name: "Wheat" },
  { id: 2, name: "Rice" }
];

export default function MyForm() {
  const [productId, setProductId] = useState("");

  const productOptions = React.useMemo(() => products.map(p => ({
    value: p.id.toString(),
    label: p.name
  })), []);

  return (
    <SearchableSelect
      name="productId"
      value={productId}
      onChange={setProductId}
      options={productOptions}
      placeholder="Select a product..."
      required
    />
  );
}
```

### Integration with "Add New" (Special Option)
To provide quick shortcuts (like registering a new party):
```jsx
const supplierOptions = React.useMemo(() => [
  { value: "new", label: "➕ Add New Supplier", specialOption: true },
  ...suppliers.map(s => ({
    value: s.id.toString(),
    label: s.name,
    subLabel: s.phoneNumber
  }))
], [suppliers]);

// Render
<SearchableSelect
  value={supplierId}
  onChange={(val) => {
    if (val === "new") {
      openCreateSupplierModal();
    } else {
      setSupplierId(val);
    }
  }}
  options={supplierOptions}
/>
```

---

## 🛠 Design Decisions & Implementation Details

- **Focus Routing**: The `ref` forwarded via `React.forwardRef` attaches to the visible `<button>` trigger instead of the hidden `<input>`. This allows keyboard/focus flow handlers (such as custom form focus hooks or Fast Entry helpers) to naturally target and open/focus the component.
- **Scroll Into View**: The component utilizes `scrollIntoView({ block: "nearest" })` programmatically within an effect triggered by `highlightedIndex` updates. This keeps keyboard navigation clean and prevents user fatigue on large lists.
