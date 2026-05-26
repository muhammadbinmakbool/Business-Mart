# Business-Mart Developer Guide: Premium Reusable UI Components (Alert & Modal)

This guide documents the design specifications, usage conventions, and programmatic integrations for the reusable presentational **`<Alert />`** and **`<Modal />`** UI components. It describes how to employ these components dynamically across all application workflows to maintain a premium visual appearance.

---

## 1. Directory Structure

```
src/
├── components/
│   └── ui/
│       ├── Alert.js           # Reusable inline notice banner component
│       └── Modal.js           # Reusable size-varied overlay dialog component
├── lib/
│   └── errors/
│       ├── errorCodes.js      # Structured validation error registry
│       ├── AppError.js        # Serializable error exception wrapper
│       └── errorPresentation.js # Error-to-component UI mapping helper
```

---

## 2. Reusable Presentation Components

All UI components are strictly presentational ("dumb" elements) and receive data via props. They never read state or check business rules directly, making them highly reusable across different contexts.

### A. Reusable Inline Alerts (`<Alert />`)
The `<Alert />` component is designed for displaying inline notifications, warnings, system updates, and successes. It has a modern glassmorphic background design, custom left-accent borders, and automatic iconography.

```javascript
import Alert from "@/components/ui/Alert";
import { Sparkles } from "lucide-react";

// Standard Usage
<Alert
  type="warning"
  title="Finalized Invoice Notice"
  message="Modifying this invoice will trigger an atomic recalculation of all supplier item balances."
/>

// Usage with Custom Icon overrides
<Alert
  type="success"
  icon={Sparkles}
  title="New Feature Activated"
  message="Real-time grain tracking ledger reconciliation is now active."
/>
```

#### Supported Properties (Props):
| Prop Name | Type | Allowed Values | Description |
| :--- | :--- | :--- | :--- |
| `type` | String | `'info' \| 'warning' \| 'error' \| 'success'` | Dictates styling theme, backgrounds, borders, and default icons. |
| `title` | ReactNode | String / HTML / React Element | Main bold title text displayed at the top of the alert. |
| `message` | ReactNode | String / HTML / React Element | Detailed context description text. |
| `icon` | LucideIcon | Lucide Icon Component | Optional override icon. If omitted, matches the preset `type` icon. |
| `className` | String | Tailwind CSS Classes | Optional styling overrides and spacing extensions. |

---

### B. High-Order Presentational Modals (`<Modal />`)
The `<Modal />` component is a high-order blocking dialog overlay. It manages keyboard `Escape` closing, overlay backdrop click-dismissals, body scroll locking, responsive spacing, and has built-in preset types and sizes.

#### Standard Action Dialog Mode
Suitable for prompt actions like delete confirmations, warning warnings, and status changes:

```javascript
import Modal from "@/components/ui/Modal";

<Modal
  isOpen={isConfirmOpen}
  onClose={() => setIsConfirmOpen(false)}
  title="Revert Intake Status"
  description="This action will restore active inventory"
  type="warning"
  confirmLabel="Revert Status"
  onConfirm={handleRevertStatus}
>
  <p className="text-sm text-muted-foreground">
    Reverting this transaction will remove the active sale trace tied to buyer party.
  </p>
</Modal>
```

#### Pure Custom Composition Mode
If you need custom forms, custom buttons, or complex views inside the modal, set `footer={null}` or pass a custom React Node into `footer`:

```javascript
<Modal
  isOpen={isCustomOpen}
  onClose={() => setIsCustomOpen(false)}
  title="Add Custom Billing Charge"
  type="info"
  footer={null} // Disables default buttons to use the button inside the form below
>
  <form onSubmit={handleCustomSubmit} className="space-y-4">
    <input type="text" placeholder="Charge Name" className="border p-2 rounded w-full" />
    <input type="number" placeholder="Amount" className="border p-2 rounded w-full" />
    
    <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-bold">
      Save Custom Charge
    </button>
  </form>
</Modal>
```

#### Supported Properties (Props):
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

## 3. Pairing Components with Structured Error Handling

While these UI components are generic presentation blocks, they seamlessly pair with the **Structured Error Propagation System** to provide consistent user experiences during data validation or system conflicts.

### A. Throwing Serializable Exceptions in Services
Instead of raw strings, service engines throw structured `AppError` objects:

```javascript
import { createAppError } from "@/lib/errors/AppError";

if (stockQty < requestedQty) {
  throw createAppError(
    "INSUFFICIENT_STOCK",
    `Cannot complete sale. Only ${stockQty} MAUNDS available in store.`
  );
}
```

### B. Client Side Resolution and Dialog Display
Client actions catch the server error, resolve it through the presentation mapper, and update the `<Modal />` properties dynamically:

```javascript
import { getErrorPresentation } from "@/lib/errors/errorPresentation";

export default function MyForm() {
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });

  const onSubmit = async (data) => {
    const result = await saveAction(data);
    
    if (result?.error) {
      // Resolves exact title, message and type mapped to ERROR_CODES
      const presentation = getErrorPresentation(result);
      
      setErrorModal({
        isOpen: true,
        title: presentation.title,
        message: presentation.message,
        type: presentation.type
      });
    }
  };

  return (
    <>
      <form onSubmit={onSubmit}>
        {/* fields */}
      </form>

      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        type={errorModal.type}
        confirmLabel="OK, Understood"
        onConfirm={() => setErrorModal({ ...errorModal, isOpen: false })}
        cancelLabel={null}
      >
        <p className="text-sm text-muted-foreground">{errorModal.message}</p>
      </Modal>
    </>
  );
}
```
