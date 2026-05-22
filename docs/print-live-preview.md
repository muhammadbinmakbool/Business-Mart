# Live Print Template Preview & Styling Editor

This document outlines how to customize, edit, and instantly preview printed receipts and downloaded PDF invoices inside Business Mart.

---

## 🚀 How to Access the Live Editor

### 1. Through the Settings Page
1. Click **Settings** in the main sidebar menu.
2. Under **Print Subsystem Customization**, you will see all available templates:
   - **Sale Invoice Template**
   - **Intake Receipt Template**
   - **Supplier Settlement Invoice**
   - **Ledger Report (Landscape)**
3. Click the arrow button next to any template to open it in the previewer.

### 2. Direct URLs
You can navigate directly to the following routes:
- **Sale Invoice**: `/print/preview?type=sale`
- **Goods Intake**: `/print/preview?type=intake`
- **Supplier Settlement**: `/print/preview?type=settlement`
- **Ledger Statement**: `/print/preview?type=ledger`

---

## 🛠️ Editing Templates and Live Hot-Reloading

The print subsystem is engineered to support **real-time styling updates** during local development:

1. Open the preview route (e.g. `/print/preview?type=sale`).
2. The page automatically fetches the **latest record** from the database to render realistic mock data. 
   - *Tip: If you want to load a specific transaction, enter its database ID in the "Record ID" field in the header and click "Load".*
3. Open the corresponding React template component file in your code editor:

| Document Type | React Template Location |
|---|---|
| Sale Invoice | `src/print/templates/SaleInvoiceTemplate.js` |
| Goods Intake | `src/print/templates/IntakeReceiptTemplate.js` |
| Supplier Settlement | `src/print/templates/SettlementInvoiceTemplate.js` |
| Ledger Report | `src/print/templates/LedgerTemplate.js` |

4. Modify any text, layout class, or inline style.
5. Save the file.
6. Next.js **Hot Module Replacement (HMR)** will trigger. The preview panel will automatically update the printed template layout **instantly without reloading the page**.

---

## 🔬 Under the Hood: How the Preview Works

To ensure the preview is a 100% accurate representation of the actual print output, it uses a **React Portal** inside a styling-isolated iframe:

### 1. Iframe Styling Isolation
The parent Next.js application runs **Tailwind CSS v4** which generates modern colors (`oklch()`, `oklab()`, etc.) that are unsupported by the PDF rendering engine (`html2canvas`). 

To prevent these styles from leaking into the preview, we render the template inside a native `<iframe>`. The preview frame compiles and injects **only** `src/print/styles/printStyles.js` (pure hex, rgb, and rgba styles) into the iframe head. None of the parent application's stylesheets are loaded.

### 2. React Portal Mounting
Instead of converting the component to an HTML string (which disables React state and hot-reloading), the `PrintPreviewFrame.js` component creates a portal:

```javascript
createPortal(children, doc.getElementById("print-root"))
```

This mounts the actual React template component tree directly inside the iframe's DOM body. Because it remains a live React node in the active DOM tree, Next.js can hot-reload changes directly into the iframe without requiring a page refresh.

---

## ⚠️ Styling Rules for Customization

When styling templates, you must follow the rules below to prevent PDF generation failures:

* **Use print-safe classes**: Only use utility classes defined in `src/print/styles/printStyles.js`.
* **Use inline Hex/RGB styles**: When writing custom colors inline, always use hex or rgba:
  ```jsx
  <div style={{ color: '#1e293b', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
  ```
* **DO NOT use Tailwind theme variables**: Avoid classes like `bg-background`, `text-primary`, or `border-border` from the parent application. They resolve to `oklch` theme variables which will break the PDF generator.


*/From AntiGravity Chat Screen:

How to Live Edit and Preview Print Templates
We built a dedicated Print Template Live Editor route in the application: 👉 /print/preview

To access it, run the application (your dev server is already running via npm run dev) and navigate to:

Sale Invoice Preview: http://localhost:3000/print/preview?type=sale
Intake Receipt Preview: http://localhost:3000/print/preview?type=intake
Supplier Settlement Preview: http://localhost:3000/print/preview?type=settlement
Ledger Report Preview: http://localhost:3000/print/preview?type=ledger

* **How it Works (Under the Hood)**

**Auto-fallback Data**: If you don't specify a Record ID in the URL, the page automatically queries your database for the latest record of that type to populate the preview. You can also type any custom record ID in the top right box and click Load.

**Double Isolation (No styling leaks)**: Just like the print/download runtime, the preview template renders inside a visible iframe containing only the safe printStyles.js. This guarantees that you see exactly what the printed/downloaded copy will look like, without any Next.js/Tailwind styling interference.

**Hot Module Replacement (HMR)**: The preview page uses a React Portal (createPortal) to mount the templates directly inside the iframe's DOM. 
When you edit any template file in your code editor (e.g. SaleInvoiceTemplate.js or printStyles.js), Next.js immediately hot-reloads the component.
The changes are rendered instantly inside the preview iframe, showing you how your edits affect the print output without needing to refresh the page or click download again.

---

## 📋 Step-by-Step Guide: Adding a New Print Template

If a colleague or friend gives you a custom template file (e.g. `CustomInvoiceTemplate.js`), simply pasting it into `src/print/templates/` will **not** work automatically. You must register it so the application knows how to fetch its data, map its properties, and show it in the previewer.

Follow these 5 steps to register and use a new template:

### Step 1: Paste the Template Component
Place the new template component inside the templates folder:
`src/print/templates/CustomInvoiceTemplate.js`

Ensure it takes a single `data` prop and wraps its root container inside `<BasePrintLayout>` (to automatically receive the company header, watermark, and footer layout):
```jsx
import React from "react";
import BasePrintLayout from "./BasePrintLayout";

export default function CustomInvoiceTemplate({ data }) {
  return (
    <BasePrintLayout
      title="Custom Invoice"
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
    >
      <div>{/* Friend's print-safe JSX content */}</div>
    </BasePrintLayout>
  );
}
```

### Step 2: Define a Data Mapper
Add a mapper function in `src/print/mappers/dataMappers.js` to translate raw database models into the shape of the `data` object expected by the template:
```javascript
export function mapCustomToPrintModel(rawDbItem) {
  return {
    documentId: rawDbItem.invoiceNumber || `CUST-${rawDbItem.id}`,
    entryDate: rawDbItem.createdAt,
    status: rawDbItem.status,
    // Add other fields expected by your template...
  };
}
```

### Step 3: Register in Print Utilities
Import the new template and mapper inside `src/print/utils/printUtils.js`, and add a case for it in the `switch (templateType)` statement:
```javascript
import CustomInvoiceTemplate from "../templates/CustomInvoiceTemplate";
import { mapCustomToPrintModel } from "../mappers/dataMappers";

// Inside renderTemplateToHTML(templateType, data):
case "custom": {
  const mapped = mapCustomToPrintModel(data);
  htmlString = renderToString(<CustomInvoiceTemplate data={mapped} />);
  orientation = "portrait"; // or "landscape"
  break;
}
```

### Step 4: Register in Preview Page
To enable hot-reloaded previews, register the template in `src/app/print/preview/page.js`. Add a case in `switch(type)` to fetch a sample record from the database and pass it to the component:
```javascript
import CustomInvoiceTemplate from "@/print/templates/CustomInvoiceTemplate";
import { mapCustomToPrintModel } from "@/print/mappers/dataMappers";

// Inside the switch(type):
case "custom": {
  let record = await prisma.customTransaction.findFirst({
    orderBy: { createdAt: "desc" }
  });
  if (!record) {
    errorMsg = "No Custom Records found in the database.";
  } else {
    const mapped = mapCustomToPrintModel(record);
    content = <CustomInvoiceTemplate data={mapped} />;
    docIdText = record.invoiceNumber || `ID: ${record.id}`;
  }
  break;
}
```

### Step 5: Add to Settings Workspace
Add your new template to the list of templates inside `src/app/settings/page.js` to see it in the settings dashboard:
```javascript
const templates = [
  // ... existing templates
  {
    name: "Custom Partner Invoice",
    description: "Preview and style the custom template for partner company invoices.",
    type: "custom",
    path: "/print/preview?type=custom"
  }
];
```
Once added, you can click on the template from Settings, view it, and edit the file under `src/print/templates/CustomInvoiceTemplate.js` with instant live hot-reloading!