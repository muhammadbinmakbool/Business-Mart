# Responsive Header Layout & Dynamic Actions Collapsing Pattern

This developer guide details the premium design system pattern used for rendering header details, status badges, and action buttons in a highly responsive and fluid manner. It explains the mechanics behind preventing flexbox shrink elastic jitter while guaranteeing smooth progressive collapsing on different screen widths.

---

## 🎯 The Core Problem: Flexbox Elastic Jitter

When a detail page contains an **Invoice/Intake Title (Div 1)** and a set of **Action Buttons (Div 2)** inside a flex container:
1. If Div 1 is marked as `flex-1` (allowed to shrink) and Div 2 is marked as `shrink-0`, narrowing the screen forces Div 1 to shrink first.
2. If Div 2 uses standard viewport breakpoints or ResizeObservers to collapse buttons one-by-one, when a button collapses, the total width of Div 2 drops instantly.
3. This sudden drop frees up horizontal space, prompting the browser to expand Div 1 back to its natural size.
4. Continuing to shrink the screen repeats this loop: Div 1 shrinks $\rightarrow$ another button collapses $\rightarrow$ Div 1 expands again.

This creates an extremely unprofessional **"elastic/jittery" resizing behavior**.

---

## 🛠️ The Solution: Double-Orchestrated Layout Priorities

We introduced two synchronized components: `ResponsiveHeader` and `ResponsiveActions`. They cooperate using **strict width-based shrink prioritization**.

```mermaid
graph TD
    A[Screen Narrows] --> B{Container Width >= 420px?}
    B -- Yes -- Click to shrink gap --> C[Title Div 1: shrink-0]
    C --> D[ResponsiveActions: Collapses buttons 1-by-1]
    D --> E[Div 2 shrinks cleanly, Div 1 remains perfectly static]
    B -- No -- Buttons fully collapsed --> F[Title Div 1: flex-1 min-w-0]
    F --> G[Title Div wraps/shrinks cleanly on small screens]
```

### 1. The Header Component (`ResponsiveHeader.js`)

`ResponsiveHeader` acts as the single layout orchestrator. It uses a `ResizeObserver` to monitor its own physical client width and controls the dynamic shrink classes on the Title:

```javascript
// Determine when all actions are collapsed into the dropdown
const isFullyCollapsed = containerWidth < 420;

return (
  <div ref={headerRef} className="flex items-center justify-between gap-4 border-b pb-5 w-full">
    <div
      className={cn(
        "flex items-center gap-4 min-w-0 transition-all duration-150",
        isFullyCollapsed ? "flex-1" : "shrink-0"
      )}
    >
      {/* Back Arrow & Title */}
    </div>
    
    <ResponsiveActions containerWidth={containerWidth} {...actionsProps} />
  </div>
);
```

### 2. The Actions Component (`ResponsiveActions.js`)

`ResponsiveActions` receives the calculated `containerWidth` from the header. Instead of viewport breakpoints (which trigger based on the browser window and ignore sidebar or page constraints), it hides buttons based on the **actual pixels available inside the parent container**:

- 🌟 **Delete Button**: Visible inline only when `containerWidth >= 780px`
- 📄 **Download PDF Button**: Visible inline only when `containerWidth >= 680px`
- 🖨️ **Print Button**: Visible inline only when `containerWidth >= 540px`
- ✏️ **Edit Button**: Visible inline only when `containerWidth >= 420px`
- 🛠️ **Custom Extra Actions**: Visible inline only when `containerWidth >= 880px`

If any active button is collapsed below its pixel threshold, a premium **"Actions" Dropdown** is automatically shown to contain the collapsed items.

---

## ✅ Usage Example

```javascript
import ResponsiveHeader from "@/components/ResponsiveHeader";
import { deleteSaleAction, updateSaleStatusAction } from "@/modules/sales/controllers/saleActions";
import StatusUpdateButtons from "./StatusUpdateButtons";

export default async function SaleDetailsPage({ params }) {
  const sale = await getSale(params.id);

  return (
    <ResponsiveHeader
      backUrl="/sales"
      title={
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sale {sale.saleNumber}</h1>
          <p className="text-sm text-muted-foreground">Detailed arrival record.</p>
        </div>
      }
      editUrl={sale.status === "PENDING" ? `/sales/${sale.id}/edit` : null}
      printType="sale"
      printData={sale}
      printFilename={`Sale-${sale.saleNumber}`}
      deleteId={sale.id}
      deleteAction={deleteSaleAction}
      deleteLabel="Sale Invoice"
      deleteRedirect="/sales"
      extraActions={
        <StatusUpdateButtons id={sale.id} currentStatus={sale.status} updateAction={updateSaleStatusAction} />
      }
    />
  );
}
```

---

## 📌 Standard Design Rules
When adding new detail headers or modifying billing entities:
1. Always use `ResponsiveHeader` rather than manually constructing button groups or custom dropdown sets.
2. Ensure the `title` node is kept clean with correct hierarchy (`<h1>` followed by descriptive metadata).
3. Do not set absolute styles or static padding/margins that could interfere with flex layout width propagation.
