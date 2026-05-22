# Centralized Print & PDF Document Generation System

Business Mart features a fully modular, decoupled print and PDF generation subsystem. This document outlines the architecture, data-flow, styling strategy, and guidelines for adding or customizing templates.

---

## 📂 System Architecture

All printing-related components, generators, configuration, and helpers are encapsulated within the `src/print/` directory to prevent layout logic from mixing with standard React pages:

```text
src/print/
├── components/
│   └── PrintButtons.js        # Client component rendering "Print" and "Download PDF" buttons
├── config/
│   └── documentConfig.js      # Global branding config (company name, address, email, watermark)
├── generators/
│   └── pdfGenerator.js        # Thin wrapper around html2pdf.js for client-side PDF download
├── mappers/
│   └── dataMappers.js         # Decoupling layer mapping raw database entities to stable template objects
├── styles/
│   └── print.css              # Print margins, page-break behavior, watermarks, and font sizes
├── templates/
│   ├── BasePrintLayout.js     # Shared shell layout (branding header, watermark container, meta footer)
│   ├── IntakeReceiptTemplate.js # Goods Intake receipt layout
│   ├── LedgerTemplate.js      # Landscape Monthly Reconciliation report layout
│   ├── SaleInvoiceTemplate.js # Buyer Sale invoice layout
│   └── SettlementInvoiceTemplate.js # Supplier Settlement invoice layout
└── utils/
    └── printUtils.js          # Handles React server-rendering, CSS stylesheet cloning, and iframe routing
```

---

## 🔄 Lifecycle of a Print Action

1. **Trigger**: The user clicks "Print" or "Download PDF" in the UI (`PrintButtons.js`).
2. **Mapping**: The component takes raw database inputs and transforms them into a normalized display format via `dataMappers.js`. This guarantees that database schema changes do not directly break rendering structures.
3. **Rendering**: The mapped data is passed into the designated template (e.g., `SaleInvoiceTemplate.js`).
4. **Serialization**: `printUtils.js` converts the React component into a raw HTML string using `renderToString` from `react-dom/server`.
5. **Styles Injection**: A hidden `<iframe>` is spawned. All active Tailwind compilation style tags and `src/print/styles/print.css` are cloned into its head.
6. **Execution**:
   * **Print**: The iframe's window triggers `.print()`, prompting the native browser dialogue.
   * **PDF**: The HTML content is passed to `pdfGenerator.js` (`html2pdf.js`) to generate and download the document with precise margins.

---

## 🎨 Global Configuration

Branding details, watermark settings, and templates version metadata can be edited globally in `src/print/config/documentConfig.js`:

```javascript
export const documentConfig = {
  company: {
    name: "Business Mart",
    tagline: "Grain Market & Commission Agent Operations",
    address: "New Grain Market, Suite A-10, Punjab, Pakistan",
    phone: "+92 300 1234567",
    email: "billing@businessmart.com"
  },
  watermark: {
    enabled: true,
    text: "BUSINESS MART"
  },
  templateVersion: "v1.0.0"
};
```

---

## 🛠️ How to Customize Template Designs

To customize the design of a document, you only need to modify its specific template file in `src/print/templates/`.

### Example: Modifying the Sale Invoice Design

1. Open `src/print/templates/SaleInvoiceTemplate.js`.
2. Edit the JSX code. The templates support full standard Tailwind CSS styling:
   * **Page Breaks**: Use Tailwind `break-inside-avoid` or the custom class `no-break` to prevent tables/sections from tearing awkwardly across pages.
   * **Headers/Footers**: Handled automatically by wrapping the template's children with `<BasePrintLayout>`:
     ```javascript
     export default function CustomSaleInvoiceTemplate({ data }) {
       return (
         <BasePrintLayout
           title="Sales Receipt"
           documentId={data.documentId}
           date={data.entryDate}
           status={data.status}
         >
           {/* Your custom HTML/Tailwind layout goes here */}
         </BasePrintLayout>
       );
     }
     ```

---

## 📄 Page Layout Orientation Rules

### Portrait Documents (A4)
* **Intakes, Sales, Supplier Settlements** are rendered in Portrait mode.
* Central styling in `src/print/styles/print.css` defines the page size:
  ```css
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 15mm 15mm;
  }
  ```

### Landscape Documents (A4 Landscape)
* **Ledger Reconciliation Report** is rendered in Landscape mode to prevent horizontal clipping of audit columns.
* This is activated dynamically by applying the `print-landscape` utility class on the wrapper element:
  ```css
  @media print {
    body.print-landscape {
      width: 297mm !important;
      height: 210mm !important;
    }
    .print-landscape @page {
      size: A4 landscape;
    }
  }
  ```
* This is configured inside `src/print/utils/printUtils.js` when the document type is `"ledger"`.

---

## 🧩 Adding a New Document Type

1. **Create Template**: Add `src/print/templates/NewDocumentTemplate.js`.
2. **Add Mapper**: Add mapping logic to `src/print/mappers/dataMappers.js` (e.g. `mapNewDocument(rawData)`).
3. **Register in Utils**: Update `src/print/utils/printUtils.js` inside `renderTemplateToHTML(type, data)` to map your new type:
   ```javascript
   case "new_document":
     const mappedData = mapNewDocument(data);
     return renderToString(<NewDocumentTemplate data={mappedData} />);
   ```
4. **Trigger Buttons**: Render `<PrintButtons type="new_document" data={rawObject} filename="file-name" />` on the details page.
