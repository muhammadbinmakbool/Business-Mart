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

## 🔗 Integration Architecture

Print templates and reporting components must stay database-agnostic. To fetch settings data:
1. Controllers or Server Pages fetch `getGeneralSettingsAction()` and `getPrintSettingsAction()` in parallel.
2. The objects are merged client-side/server-side and passed downstream as a single `printConfig` prop.
3. The merge handler `getMergedDocumentConfig(settings)` maps general values to existing template-supported keys:
   - `businessName` ➡️ `companyName`
   - `address` ➡️ `companyAddress`
   - `phoneNumber` ➡️ `companyPhone`
   - `businessEmail` ➡️ `companyEmail`
   - `logoPath` ➡️ `logoUrl`
   - `currencySymbol` ➡️ `defaultCurrency`
   - `decimalPlaces` ➡️ `decimalPlaces`
   - `dateFormat` ➡️ `dateFormat`

---

## 🚀 Usage & Future Extension Guidelines

- **Logo Upload**: Uploaded files are written directly to the server's local disk under `public/uploads/` with a cache-busting timestamp prefix. Only the relative path `/uploads/filename` is saved to the database.
- **Precision (Decimal Places)**: Templates use the custom `formatCurrency` wrapper, which accepts the dynamic `decimalPlaces` preference to enforce consistent rounding and rendering decimals.
