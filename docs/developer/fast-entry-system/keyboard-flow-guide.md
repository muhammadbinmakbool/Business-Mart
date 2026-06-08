# Keyboard Flow System — Developer Guide

> **Module**: `src/lib/keyboardFlowManager.js` + `src/hooks/useKeyboardFlow.js`  
> **Phase**: 1 (Foundation Layer)  
> **Status**: Active  

---

## Overview

The Keyboard Flow System is the foundational navigation engine for Business Mart's Fast Entry initiative. It enables **keyboard-first form traversal** so operators can complete data entry without touching the mouse.

### Design Principles

1. **Zero ownership** — the system attaches a `keydown` listener to each field but does NOT own `onChange`, `onBlur`, or `value`. Existing form logic is untouched.
2. **Linked-list navigation** — each field declares its `next` and `prev` neighbors. No implicit ordering.
3. **Pure JS core** — `KeyboardFlowManager` has no React dependency. The React hook (`useKeyboardFlow`) is a thin adapter layer.
4. **No business logic** — this system only moves focus and triggers callbacks. It never reads or writes form data.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  React Form Component (SaleForm, IntakeForm, …) │
│                                                 │
│   <input ref={registerField("weight")} />       │
│                                                 │
│   useKeyboardFlow({                             │
│     fields: [...],                              │
│     onSubmit: handleSubmit,                     │
│   })                                            │
└────────────┬────────────────────────────────────┘
             │ ref callback
             ▼
┌─────────────────────────────────┐
│  KeyboardFlowManager (pure JS) │
│                                 │
│  _fields: Map<name, {ref, next, prev}> │
│  handleKeyDown(event, name)     │
│  focusField(name)               │
└─────────────────────────────────┘
```

---

## Key Bindings

| Shortcut | Action | Notes |
|---|---|---|
| `Enter` | Move to **next** field | Calls `preventDefault()` to block form submit |
| `Shift + Enter` | Move to **previous** field | |
| `Ctrl + Enter` | **Submit** the form | Triggers the `onSubmit` callback |
| `Escape` | **Blur** active field | Optionally triggers `onCancel` |

---

## API Reference

### `KeyboardFlowManager` (class)

**Location**: `src/lib/keyboardFlowManager.js`

#### Constructor

```js
const manager = new KeyboardFlowManager({
  onSubmit: () => { /* save form */ },
  onCancel: () => { /* optional */ },
});
```

#### Methods

| Method | Signature | Description |
|---|---|---|
| `registerField` | `(name, ref, { next, prev })` | Register a DOM element in the navigation graph |
| `unregisterField` | `(name)` | Remove a field from the registry |
| `getNextField` | `(currentName) → string\|null` | Returns the next field name |
| `getPreviousField` | `(currentName) → string\|null` | Returns the previous field name |
| `focusField` | `(name) → boolean` | Focuses a field. Auto-selects value in number/text inputs |
| `handleKeyDown` | `(event, currentFieldName)` | Core key router — call from `keydown` event |
| `destroy` | `()` | Clears all refs and callbacks for GC |

---

### `useKeyboardFlow` (hook)

**Location**: `src/hooks/useKeyboardFlow.js`

#### Parameters

```js
useKeyboardFlow({
  fields: [
    { name: "partyId",   next: "productId", prev: null },
    { name: "productId", next: "weight",    prev: "partyId" },
    { name: "weight",    next: "rate",      prev: "productId" },
    { name: "rate",      next: null,        prev: "weight" },
  ],
  onSubmit: () => handleSubmit(),
  onCancel: () => {},  // optional
});
```

| Param | Type | Required | Description |
|---|---|---|---|
| `fields` | `Array<{ name, next, prev }>` | Yes | Navigation graph definition |
| `onSubmit` | `Function` | Yes | Called on `Ctrl + Enter` |
| `onCancel` | `Function` | No | Called on `Escape` |

#### Returns

| Property | Type | Description |
|---|---|---|
| `registerField` | `(name) → refCallback` | Returns a React ref callback to attach to an element |

---

## Integration Guide

### Step 1: Define field order

```js
const FIELDS = [
  { name: "partyId",   next: "productId", prev: null },
  { name: "productId", next: "unit",      prev: "partyId" },
  { name: "unit",      next: "quantity",  prev: "productId" },
  { name: "quantity",  next: "rate",      prev: "unit" },
  { name: "rate",      next: null,        prev: "quantity" },
];
```

### Step 2: Use the hook

```jsx
function MyForm() {
  const { registerField } = useKeyboardFlow({
    fields: FIELDS,
    onSubmit: () => handleSubmit(),
  });

  return (
    <form>
      <select ref={registerField("partyId")} ...>
        ...
      </select>
      <select ref={registerField("productId")} ...>
        ...
      </select>
      <select ref={registerField("unit")} ...>
        ...
      </select>
      <input ref={registerField("quantity")} type="number" ... />
      <input ref={registerField("rate")} type="number" ... />
    </form>
  );
}
```

### Step 3: That's it

No `onKeyDown` prop needed. The hook attaches listeners internally via the ref callback. Your existing `onChange`, `onBlur`, and `value` props are **completely unaffected**.

---

## Safety & Compatibility

### What this system does NOT do

- ❌ Does NOT auto-submit forms (only `Ctrl + Enter` triggers the callback)
- ❌ Does NOT modify form values or state
- ❌ Does NOT override `onChange`, `onBlur`, or any existing handlers
- ❌ Does NOT intercept `Ctrl+C`, `Ctrl+V`, `Ctrl+Z`, or other OS shortcuts
- ❌ Does NOT conflict with DataTable sorting or other page-level shortcuts

### Focus behavior

- `focusField()` calls `element.focus()` directly on the DOM node
- For `<input type="number">` and `<input type="text">`, it also calls `element.select()` to auto-highlight the value for quick overtyping
- If a field is disabled or hidden, focus silently fails (no error thrown)

### Cleanup

- On component unmount, all keydown listeners are removed and the manager is destroyed
- No memory leaks from orphaned refs or event listeners

---

## Extending in Future Phases

This foundation is designed to be extended without breaking changes. For detailed integration patterns (including ref merging, dynamic fields, and keydown overrides), see the [Phase 2 Integration Guide](file:///d:/Projects/Next%20JS/docs/developer/fast-entry-system/phase-2-integration.md).

| Phase | Addition | Status / Impact |
|---|---|---|
| Phase 2 | Intake + Sales Form Integration | Completed |
| Phase 3 | Quick-Add Modals | Planned (adds interruption-free entity creation) |
| Phase 4 | Smart Defaults | Planned (autofills based on previous inputs) |

---

## Troubleshooting

### Field not receiving focus

1. Ensure `ref={registerField("fieldName")}` is on the actual `<input>` or `<select>`, not a wrapper div.
2. Ensure the element is not `disabled` at the time of focus.
3. Check that the field name matches exactly in the `fields` array.

### Enter submits the form instead of navigating

This means the keydown listener is not attached. Verify:
- The `ref` callback is being called (element is mounted)
- The field name is registered in the `fields` config

### Ctrl+Enter does nothing

Ensure `onSubmit` is passed to `useKeyboardFlow` and is not `undefined`.
