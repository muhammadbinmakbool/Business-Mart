# Business-Mart Developer Guide: Standardized UI & Error Propagation Architecture

This document describes the design and usage of the decoupled, presentation-only component architecture and structured error mapping system introduced to standardize inventory checks, state transitions, and user notifications.

---

## 1. Directory Structure

```
src/
├── components/
│   └── ui/
│       ├── Alert.js           # Reusable presentational inline notifications
│       ├── Modal.js           # Reusable size-varied and type-driven blocking viewport dialogs
│       └── Toast.js           # Reusable premium HOC Toast component & showToast utility
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

### A. Inline Alerts (`<Alert />`)
A premium glassmorphic banner for inline, non-blocking page notices.

```javascript
import Alert from "@/components/ui/Alert";
import { Sparkles } from "lucide-react";

// Standard Usage
<Alert
  type="warning"
  title="Operational Warning"
  message="All totals will be recalculated from source items upon saving."
/>

// Usage with Custom Icon overrides
<Alert
  type="success"
  icon={Sparkles}
  title="New Feature Activated"
  message="Real-time grain tracking ledger reconciliation is now active."
/>
```

#### Properties (Props):
| Prop Name | Type | Allowed Values | Description |
| :--- | :--- | :--- | :--- |
| `type` | String | `'info' \| 'warning' \| 'error' \| 'success'` | Dictates styling theme, backgrounds, borders, and default icons. |
| `title` | ReactNode | String / HTML / React Element | Main bold title text displayed at the top of the alert. |
| `message` | ReactNode | String / HTML / React Element | Detailed context description text. |
| `icon` | LucideIcon | Lucide Icon Component | Optional override icon. If omitted, matches the preset `type` icon. |
| `className` | String | Tailwind CSS Classes | Optional styling overrides and spacing extensions. |

---

### B. Blocking Dialog Modals (`<Modal />`)
A blocking dialog viewport supporting multiple widths (`sm`, `md`, `lg`, `xl`, `full`) and styles:

```javascript
import Modal from "@/components/ui/Modal";

// Standard Action Dialog Mode
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

// Pure Custom Composition Mode (footer overrides)
<Modal
  isOpen={isCustomOpen}
  onClose={() => setIsCustomOpen(false)}
  title="Add Custom Billing Charge"
  type="info"
  footer={null} // Disables default buttons
>
  <form onSubmit={handleCustomSubmit} className="space-y-4">
    <input type="text" placeholder="Charge Name" className="border p-2 rounded w-full" />
    <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-bold">
      Save Charge
    </button>
  </form>
</Modal>
```

#### Properties (Props):
| Prop Name | Type | Default | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `isOpen` | Boolean | `false` | `true \| false` | Controls viewport rendering of the modal overlay. |
| `onClose` | Function | — | `() => void` | Triggers when the close button, backdrop, or Escape key is pressed. |
| `title` | ReactNode | — | String / Element | Dialog header title. |
| `description` | ReactNode | — | String / Element | Subtitle context text rendered below the title. |
| `type` | String | `'info'` | `'info' \| 'warning' \| 'error' \| 'success' \| 'danger'` | Dictates styling colors, icons, and theme colors. |
| `size` | String | `'md'` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | Width limits: `sm` (384px), `md` (448px), `lg` (512px), `xl` (576px), `full` (95vw). |
| `confirmLabel` | String | — | String | Text for the action confirmation button. If omitted, no button is shown. |
| `onConfirm` | Function | — | `() => void` | Triggers when the confirm button is clicked. |
| `cancelLabel` | String | `'Cancel'` | String / `null` | Text for the cancel action button. Pass `null` to hide the button. |
| `onCancel` | Function | — | `() => void` | Optional override for the cancel action callback. Defaults to `onClose`. |
| `loading` | Boolean | `false` | `true \| false` | Disables interactive buttons and replaces confirm label text with processing. |
| `preventCloseOnBackdrop` | Boolean | `false` | `true \| false` | If `true`, disables dismissing the modal via backdrop or Escape key. |
| `footer` | ReactNode | — | React Element / `null` | Custom footer overrides. Pass `null` to disable footers completely. |

---

### C. Reusable Centralized High-Order Toasts (`showToast`)
Instead of using messy inline `toast` notifications, use the centralized, unified `showToast` utility. It outputs beautifully composed presentational cards utilizing Lucide icons, glassmorphism overlays, and modern slide-in animations.

```javascript
import { showToast } from "@/components/ui/Toast";

// Simple Usage
showToast.success("Invoice saved successfully!");

// Advanced Usage with Custom Header Title
showToast.error("Failed to authenticate session", "Security Alert");
showToast.warning("Low stock warning on Wheat bags", "Inventory Alert");
showToast.info("System refresh will happen in 5 minutes", "Maintenance Notice");
```

#### Unified API Methods:
* `showToast.success(message, title)` - Emerald Success notification (displays for 3.5s).
* `showToast.error(message, title)` - Rose Critical notification (displays for 4s).
* `showToast.warning(message, title)` - Amber Warning notification (displays for 3.5s).
* `showToast.info(message, title)` - Blue Informative notification (displays for 3s).

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
