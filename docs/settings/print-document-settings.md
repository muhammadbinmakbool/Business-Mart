# Print & Document Settings Subsystem

The **Print & Document Settings** module provides centralized display configuration for all printable document templates in the system without altering business logic or transaction values.

---

## 🎯 Architectural Principles

1. **Strict Display-Only Rule**  
   Print configurations control rendering, layouts, signatures, and footers. They must **never** influence pricing, Maund/Bag unit math, totals, ledger allocations, or account balances.
   
2. **Database-Agnostic Templates**  
   Components inside the `src/print/` subsystem are completely database-agnostic. They do not query Prisma or perform active database connections. They accept data and configuration options through explicit props (`data`, `locale`, `printConfig`).

3. **Controller-to-Frame Data Injection**  
   Print configurations are fetched at the page/controller level (Server Components/Server Actions) and passed down to print triggers (e.g. `PrintButtons`, `ResponsiveHeader`) or direct rendering routes (e.g. `PrintPreviewPage`).

---

## 💾 Database Schema

Print configurations are persisted inside the `SystemSetting` model. To avoid database bloat and nested schema dependencies, they are stored under the unified key `print_settings`:

```json
{
  "defaultTemplate": "STANDARD",
  "paperSize": "A4",
  "orientation": "PORTRAIT",
  "showLogo": true,
  "showWatermark": false,
  "showSignatures": true,
  "showDuplicateLabel": true,
  "footerNotes": "This is a computer generated document.",
  "defaultCurrency": "Rs.",
  "autoPrintAfterSave": false
}
```

---

## ⚙️ Service & Action Layer

Management of settings is handled through the settings controller (`src/modules/settings/controllers/settingsActions.js`):

- `getPrintSettingsAction()`: Retrieves the current `print_settings` configuration, falling back to predefined defaults from `documentConfig.js` if the database record does not exist.
- `savePrintSettingsAction(settings)`: Validates and saves print configuration parameters back into the database.

---

## 🖼️ Preview & Template Registry

The print subsystem handles template compilation and style isolation:

- **Isolated Print Frame**: A dedicated NextJS routing context (`/print/preview`) pulls records from the database and uses `resolvePrintTemplate` to compile and preview standard designs with styling isolated from the parent application.
- **Dynamic `@page` Injection**: The runtime renderer in `src/print/runtime/print-renderer.js` reads `paperSize` and `orientation` settings from the user's config and injects custom `@page` styles at render time, ensuring the system print dialog respects the user's choices.
- **Currency Symbols**: Global branding parameters (e.g. `defaultCurrency`) are passed to the custom formatter `formatCurrency` to align all print formats automatically.

---

## 🖥️ UI Customization Panel

The configurations are controlled from the **Print Settings** tab inside System Settings:
- Instantiated through `PrintSettingsCard.js`.
- Features real-time state sync, toggle indicators, and a link to the live editor preview.
