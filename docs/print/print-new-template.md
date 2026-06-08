## 📋 Step-by-Step Guide: Adding a New Print Template

If a colleague or friend gives you a custom template file (e.g. `CustomInvoiceTemplate.js`), simply pasting it into `src/print/templates/` will **not** work automatically. You must register it so the application knows how to fetch its data, map its properties, validate the structure, and show it in the previewer.

Follow these steps to register and use a new template:

---

### Step 1: Paste the Template Component
Place the new template component inside the templates folder:
`src/print/templates/CustomInvoiceTemplate.js`

Ensure it takes a `data` prop and an optional `locale` prop (defaulting to `"en"`), and wraps its root container inside `<BasePrintLayout>` (to automatically receive the company header, watermark, and footer layout):
```jsx
import React from "react";
import BasePrintLayout from "./BasePrintLayout";
import { PRINT_TYPOGRAPHY } from "../theme/typography";
import { PRINT_LAYOUT } from "../theme/layout";
import { t } from "../localization/locale";
import { formatCurrency, formatWeight } from "../localization/formatters";

export default function CustomInvoiceTemplate({ data, locale = "en" }) {
  const isRTL = locale === "ur";
  
  return (
    <BasePrintLayout
      title={t("customTitleKey", locale)}
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
      locale={locale}
    >
      <div className="space-y-6">
        <div className={PRINT_LAYOUT.grid2Cols}>
          <div className={PRINT_LAYOUT.card}>
            <h3 className={PRINT_TYPOGRAPHY.sectionHeader}>
              {t("billedTo", locale)}
            </h3>
            <div className={PRINT_TYPOGRAPHY.boldText}>{data.party.name}</div>
          </div>
        </div>
      </div>
    </BasePrintLayout>
  );
}
```

> [!NOTE]
> **Backward Compatibility**: Standard English templates wrapping `<BasePrintLayout>` without supporting translation or theming will still work perfectly without modifications. However, using the centralization helpers is highly recommended for design consistency.

---

### Step 2: Register Translation Keys (Optional)
If your template needs bilingual translation (e.g., English and Urdu), register your custom keys in `src/print/localization/locale.js`:
```javascript
export const TRANSLATIONS = {
  en: {
    // ... existing keys
    customTitleKey: "Custom Partner Invoice",
  },
  ur: {
    // ... existing keys
    customTitleKey: "خصوصی پارٹنر رسید",
  }
};
```

---

### Step 3: Define a Data Mapper
Add a mapper function in `src/print/mappers/dataMappers.js` to translate raw database models into the shape of the `data` object expected by the template:
```javascript
export function mapCustomToPrintModel(rawDbItem) {
  return {
    documentId: rawDbItem.invoiceNumber || `CUST-${rawDbItem.id}`,
    entryDate: format(new Date(rawDbItem.createdAt), "dd MMM yyyy"),
    status: rawDbItem.status,
    // Add other fields expected by your template...
  };
}
```

---

### Step 4: Add Zod Schema Validation
Add a Zod schema to `src/print/schemas/printSchemas.js` to ensure mapping correctness and prevent silent layout rendering bugs:
```javascript
import { z } from "zod";

export const CustomPrintSchema = z.object({
  documentId: z.string(),
  entryDate: z.string(),
  status: z.string(),
  // Add other required fields...
});
```

---

### Step 5: Register in the PRINT_REGISTRY
Import the template, mapper, and Zod schema in `src/print/registry.js`, and add it to the `PRINT_REGISTRY` configuration. You can specify a version key (e.g., `1` or `2`) to support layout evolution over time:

```javascript
import CustomInvoiceTemplate from "./templates/CustomInvoiceTemplate";
import { mapCustomToPrintModel } from "./mappers/dataMappers";
import { CustomPrintSchema } from "./schemas/printSchemas";

export const PRINT_REGISTRY = {
  // ... existing templates
  custom: {
    versions: {
      1: {
        template: CustomInvoiceTemplate,
        mapper: mapCustomToPrintModel,
        schema: CustomPrintSchema
      }
    },
    defaultVersion: 1,
    orientation: "portrait" // or "landscape"
  }
};
```

---

### Step 6: Register in Preview Page
To enable hot-reloaded previews, register the template in `src/app/print/preview/page.js` inside the `switch(type)` block. This block is responsible only for querying your database and retrieving the raw record:

```javascript
case "custom": {
  let record = await prisma.customTransaction.findFirst({
    orderBy: { createdAt: "desc" }
  });
  if (!record) {
    errorMsg = "No Custom Records found in the database.";
  } else {
    // resolvePrintTemplate maps, validates (Zod), and returns the Component
    const { Component, mappedData } = resolvePrintTemplate("custom", record);
    content = <Component data={mappedData} locale={locale} />;
    docIdText = record.invoiceNumber || `ID: ${record.id}`;
  }
  break;
}
```

---

### Step 7: Add to Settings Workspace
Add your new template configuration to the list of templates inside `src/app/settings/page.js` to show it in the settings dashboard:
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