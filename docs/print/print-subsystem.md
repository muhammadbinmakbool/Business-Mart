# Centralized Print & PDF Document Generation System

Business Mart features a fully modular, decoupled print and PDF generation subsystem. This document outlines the architecture, data-flow, styling strategy, and guidelines for adding or customizing templates.

---

## 📂 System Architecture

All printing-related components, generators, configuration, and helpers are encapsulated within the `src/print/` directory to prevent layout logic from mixing with standard React pages:

```text
src/print/
├── components/
│   └── PrintButtons.js          # Client component rendering "Print" and "Download PDF" buttons
├── config/
│   └── documentConfig.js        # Global branding config (company name, address, email, watermark)
├── mappers/
│   └── dataMappers.js           # Decoupling layer mapping raw database entities to stable template objects
├── runtime/
│   └── print-renderer.js        # ★ ISOLATED RUNTIME (creates iframe, loads html2pdf, triggers print/PDF)
├── styles/
│   ├── print.css                # Reference stylesheet
│   └── printStyles.js           # ★ SINGLE SOURCE OF TRUTH for print styles (injected into iframe)
├── templates/
│   ├── BasePrintLayout.js       # Shared shell layout (branding header, watermark, footer)
│   ├── IntakeReceiptTemplate.js # Goods Intake receipt — portrait
│   ├── LedgerTemplate.js        # Monthly Reconciliation report — landscape
│   ├── SaleInvoiceTemplate.js   # Buyer Sale invoice — portrait
│   └── SettlementInvoiceTemplate.js # Supplier Settlement invoice — portrait
└── utils/
    └── printUtils.js            # Entry utility mapping raw data and converting templates to HTML string
```

Additionally, there is an offline-compatible API route:
* `src/app/api/html2pdf/route.js` - Serves `html2pdf.bundle.min.js` from local `node_modules` directly to the iframe context.

---

## 🔄 Lifecycle of a Print / PDF Action

1. **Trigger**: The user clicks "Print" or "Download PDF" in the UI (`PrintButtons.js`).
2. **Mapping**: Raw database data is normalised into a stable display model via `dataMappers.js`.
3. **Serialization**: `printUtils.js` converts the React component to a raw HTML string using `renderToString`.
4. **Isolated Rendering**: The HTML string and options are sent to `print-renderer.js`.
5. **Iframe spawning**: A hidden `<iframe>` is created off-screen and the HTML string is written into it.
6. **Style injection**: Only `printStyles.js` is injected into the iframe head.
7. **Execution**:
   - **Print**: The iframe's `window.print()` is called to open the native browser dialog.
   - **PDF**: The iframe loads `/api/html2pdf` dynamically. Once loaded, `iframe.contentWindow.html2pdf()` runs inside the iframe context to generate and download the PDF.

---

## ⚠️ HTML2Canvas Compatibility Rules

> **This is the most critical rule of the entire print subsystem. Read carefully.**

### The Problem

`html2pdf.js` uses `html2canvas` under the hood to capture the DOM as a canvas before encoding it as PDF. The version of `html2canvas` bundled with `html2pdf.js` **does not support modern CSS color functions**:

| Unsupported function | Where it appears |
|---|---|
| `oklch()` | Tailwind v4 default color space |
| `oklab()` | CSS Color Level 4 |
| `lab()` | CSS Color Level 4 |
| `lch()` | CSS Color Level 4 |

When html2canvas encounters any of these it throws:

```
Attempting to parse an unsupported color function "lab"
```

and the PDF download silently fails.

Tailwind v4 — used in this project — generates **all** theme colors using `oklch()`. Any stylesheet imported from the parent application or computed style evaluated in the parent context will contain these functions and will crash html2canvas.

### The Solution — Isolated Print Context

We guarantee isolation in two ways:
1. **Isolated Stylesheet**: The print subsystem injects **only** `src/print/styles/printStyles.js` into the iframe. The parent application's stylesheets are never copied.
2. **Isolated Execution**: `html2pdf` and `html2canvas` are loaded and executed **inside the iframe's content window**. Since the iframe has no parent Tailwind stylesheets loaded, its computed styles will never contain `oklch` or `lab` values.

`printStyles.js` contains a complete, self-contained CSS definition using **only**:
- Hex colors (`#ffffff`, `#1e293b`, …)
- `rgb()` values
- `rgba()` values

**No CSS custom properties. No `var(--*)`. No Tailwind theme tokens.**

### Rules for Template Authors

When editing print templates (`src/print/templates/*.js`), follow these rules:

✅ **Allowed CSS classes** — any class defined in `src/print/styles/printStyles.js`

✅ **Allowed inline styles** — any style using hex / rgb / rgba values:
```jsx
<div style={{ color: "#1e293b", background: "#f8fafc" }}>
```

❌ **Forbidden** — Tailwind theme token classes that resolve through CSS variables:
```jsx
// These will NOT render correctly and may crash html2canvas:
<div className="bg-background text-foreground">    // theme variable
<div className="text-primary">                     // resolves to oklch()
<div className="border-border">                    // resolves to oklch()
<div className="text-muted-foreground">            // resolves to oklch()
```

✅ **Instead use the print-safe aliases** defined in `printStyles.js`:
```jsx
<div className="print-text-primary">              // resolves to #1d4ed8 (safe)
<div className="print-border-primary">            // resolves to rgba(29,78,216,0.2)
<div className="text-slate-800">                  // safe — hex defined in printStyles.js
```

---

## 🎨 Global Branding Configuration

Company name, address, phone, email, watermark text and system version can be edited in `src/print/config/documentConfig.js`.

---

## 🛠️ How to Customize a Template Design

To change the layout of a specific document type, edit **only** its template file. Each template is an independent React component:

| Template | File |
|---|---|
| Goods Intake Receipt | `src/print/templates/IntakeReceiptTemplate.js` |
| Sale Invoice | `src/print/templates/SaleInvoiceTemplate.js` |
| Supplier Settlement Invoice | `src/print/templates/SettlementInvoiceTemplate.js` |
| Ledger Report (landscape) | `src/print/templates/LedgerTemplate.js` |

All templates receive a pre-mapped data object (not raw Prisma data) and wrap their content inside `<BasePrintLayout>`:

```jsx
export default function SaleInvoiceTemplate({ data }) {
  return (
    <BasePrintLayout
      title="Sale Invoice"
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
    >
      {/* Your print-safe JSX layout here */}
    </BasePrintLayout>
  );
}
```

`BasePrintLayout` automatically renders the company header, watermark, and print footer, and wraps everything in `<div className="print-page">` for style isolation.

---

## 📄 Page Orientation

| Document Type | Orientation | Margin |
|---|---|---|
| Intake Receipt | A4 Portrait | 15mm 12mm |
| Sale Invoice | A4 Portrait | 15mm 12mm |
| Settlement Invoice | A4 Portrait | 15mm 12mm |
| Ledger Report | A4 Landscape | 10mm |

Orientation is controlled inside `printUtils.js`. Setting `orientation = "landscape"` for a template type automatically adjusts the `@page` rule injected into the iframe.
