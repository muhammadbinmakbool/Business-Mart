# General Settings Subsystem Documentation

The General Settings subsystem manages company identity, branding profile information, and localization preferences.

---

## ⚠️ Core Architectural Principle: Configuration Only

General Settings represent **Display & Localization Configuration only**. They must **never** influence:
1. Transactional business calculations
2. Inventory stock valuations or conversions
3. Supplier settlement financial calculations
4. Ledger matching/drift logic

Any formatting or identity parameter is purely presentation-layer metadata.

---

## 🗄️ Storage Schema & Key

General settings are serialized and persisted in the Prisma `SystemSetting` model under the unique key:

```text
general_settings
```

This separation keeps identity properties isolated from `print_settings` and `adjustment_visibility` config blobs.

### JSON Schema

```json
{
  "businessName": "Rehmania & Company",
  "businessShortName": "R&C",
  "phoneNumber": "0301-6782024",
  "businessEmail": "info@rehmania-grain.com",
  "address": "Grain Market, Rahim Yar Khan, Punjab, Pakistan",
  "logoPath": "/uploads/company-logo-1780399334088.png",
  "currencyCode": "PKR",
  "currencySymbol": "Rs.",
  "defaultLanguage": "en",
  "timezone": "Asia/Karachi",
  "dateFormat": "DD/MM/YYYY",
  "decimalPlaces": 2
}
```

---

## 🔗 Integration Architecture & Configuration Priority

Print templates, reporting views, and financial components must stay database-agnostic. To fetch settings data:
1. Controllers or Server Pages fetch `getGeneralSettingsAction()` and `getPrintSettingsAction()` in parallel.
2. The settings are merged using the strict multi-tier hierarchy in `getMergedDocumentConfig(printSettings, generalSettings)`:
   - **Identity Layer (General Settings)** takes absolute precedence for branding, profile information, currency symbols, and precision decimal places.
   - **Presentation Layer (Print Settings)** overrides layout visibility controls and template-specific configuration.
   - **System Defaults** act as final fallbacks.

The merge handler maps keys downstream for templates:
- `businessName` ➡️ `companyName`
- `address` ➡️ `companyAddress`
- `phoneNumber` ➡️ `companyPhone`
- `businessEmail` ➡️ `companyEmail`
- `logoPath` ➡️ `logoUrl`
- `currencySymbol` ➡️ `defaultCurrency`
- `decimalPlaces` ➡️ `decimalPlaces`
- `dateFormat` ➡️ `dateFormat`

---

## 🚀 Usage & File Storage Guidelines

- **Persistent File Storage (`src/lib/fileStorage.js`)**: Uploaded assets (like company logos or receipts) are managed by a generic, reusable filesystem storage utility.
  - Files are stored in a persistent directory configured via `process.env.UPLOAD_DIR` (falling back to a local `public/uploads` directory).
  - Filenames are sanitized (removing special characters and spaces, appending unique timestamps).
  - **Orphan Cleanup**: Replaced files are automatically deleted from the disk in the action layer to prevent directory bloat.

- **Precision & Rounding (`src/lib/formatters/financialFormatter.js`)**:
  - All output-boundary formatting (currency, weight, bag count) is unified under a single source of truth: `src/lib/formatters/financialFormatter.js`.
  - To prevent floating-point rounding discrepancies and ERP financial drift, the formatter imports and applies the core `round` math function from `src/lib/financial.js`.
  - **No print-specific or module-specific rounding logic is allowed in any other subsystem.** All UI, print templates, and reports must reference the single `financialFormatter` utility.
