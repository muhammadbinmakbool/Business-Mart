# Business-Mart Developer Guide: Standardized UI & Error Propagation Architecture

This document describes the design and usage of the decoupled, presentation-only component architecture and structured error mapping system introduced to standardize inventory checks, state transitions, and user notifications.

---

## 1. Directory Structure

```
src/
├── components/
│   └── ui/
│       ├── Alert.js           # Reusable presentational inline notifications
│       └── Modal.js           # Reusable size-varied and type-driven blocking viewport dialogs
├── lib/
│   └── errors/
│       ├── errorCodes.js      # Centered error code and type registry
│       ├── AppError.js        # Normalized serializable custom error class
│       └── errorPresentation.js # Error code UI translation mapping helper
```

---

## 2. Structured Error System

The application uses an **Error-First Decoupled Architecture**. Business logic services and validation frameworks throw structured exceptions instead of raw, localized strings. This allows for translation readiness (e.g. Urdu), analytics telemetry, and deterministic UI rendering.

### A. Centralized Error Codes (`errorCodes.js`)
All errors are mapped to predefined keys with a standardized UX type (`error`, `warning`, `info`, `success`) and human-readable title:

```javascript
export const ERROR_CODES = {
  INSUFFICIENT_STOCK: {
    title: "Insufficient Stock Available",
    type: "error"
  },
  TRANSACTION_BILLED: {
    title: "Transaction Already Billed",
    type: "error"
  },
  // ...
};
```

### B. Throwing AppError in Services (`AppError.js`)
When business rules are violated, use `createAppError(code, message)`:

```javascript
import { createAppError } from "@/lib/errors/AppError";

if (stockBalance < requestedWeight) {
  throw createAppError(
    "INSUFFICIENT_STOCK",
    `Cannot fulfill requested weight (${requestedWeight} KG). Only ${stockBalance} KG remaining in inventory.`
  );
}
```

### C. Client Action Handlers
Server actions or controllers capture the thrown `AppError` and return it as a plain serializable JSON object:

```javascript
try {
  // logic
} catch (error) {
  return {
    error: error.message || "An error occurred",
    code: error.code || "UNKNOWN_ERROR",
    title: error.title
  };
}
```

---

## 3. Reusable Presentation Components

All UI components are strictly presentational ("dumb" elements) and receive data via props. They never read state or check business constraints directly.

### A. `<Alert />`
A premium glassmorphic banner for inline, non-blocking page notices.

```javascript
import Alert from "@/components/ui/Alert";

<Alert
  type="warning"
  title="Operational Warning"
  message="All totals will be recalculated from source items upon saving."
/>
```

#### Properties:
- `type`: `'info' | 'warning' | 'error' | 'success'`
- `title`: String or React node
- `message`: String or React node
- `className`: Optional style extensions

---

### B. `<Modal />`
A blocking dialog viewport supporting multiple widths (`sm`, `md`, `lg`, `xl`, `full`) and types:

```javascript
import Modal from "@/components/ui/Modal";

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  description="Are you absolutely sure you want to proceed?"
  type="danger"
  confirmLabel="Delete Permanently"
  onConfirm={handleDelete}
>
  <p className="text-sm">This action cannot be undone.</p>
</Modal>
```

#### Properties:
- `isOpen`: Boolean (controls viewport rendering)
- `onClose`: Function (triggers on backdrop or Esc click)
- `type`: `'info' | 'warning' | 'error' | 'success' | 'danger'`
- `size`: `'sm' | 'md' | 'lg' | 'xl' | 'full'`
- `confirmLabel`: Action button text
- `onConfirm`: Triggered on confirmation click
- `cancelLabel`: Cancel button text (defaults to "Cancel")
- `onCancel`: Optional custom cancel callback

---

## 4. UI Resolution Mapping (`errorPresentation.js`)

Decouple your forms and actions from hardcoded error strings. Resolve errors directly to UI configurations:

```javascript
import { getErrorPresentation } from "@/lib/errors/errorPresentation";

const onSubmit = async (data) => {
  const result = await saveAction(data);
  if (result.error) {
    const presentation = getErrorPresentation(result);
    // presentation = { title, message, type }
    setErrorModal({
      isOpen: true,
      ...presentation
    });
  }
};
```
