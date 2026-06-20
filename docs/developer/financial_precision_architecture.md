# Financial Precision Architecture

This document describes the unified financial precision architecture designed to handle decimal formatting, currency symbols, and mathematical calculations across the ERP application.

---

## 1. Core Abstractions & Formatting Layer

All financial formatting is centralized in `src/lib/formatters/financialFormatter.js`. Direct invocations of `Number.toLocaleString` or hardcoded `"Rs."` prefixes are forbidden.

### Centralized Formatter APIs

* **`formatCurrency(amount, locale = "en", symbol = "Rs. ", decimalPlaces = 2)`**
  Formats currency amounts using dynamic formatting flags.
  * *Parameters:*
    * `amount`: The numeric amount to format.
    * `locale`: Target language code (e.g., `"en"`, `"ur"`).
    * `symbol`: The currency prefix (e.g., `"Rs."`, `"$"`).
    * `decimalPlaces`: The decimal precision (e.g., `0`, `1`, `2`).
  * *Returns:* A formatted string representation.

---

## 2. React Context & Hook

In frontend React pages and components, retrieve dynamic settings via `useSettings()` from the `SettingsContext`.

### Usage Example:
```jsx
import { useSettings } from "@/components/layout/SettingsContext";
import { formatCurrency } from "@/lib/formatters/financialFormatter";

export default function MyWidget({ balance }) {
  const { decimalPlaces, currencySymbol } = useSettings();
  
  return (
    <div>
      Net Balance: {formatCurrency(balance, "en", currencySymbol, decimalPlaces)}
    </div>
  );
}
```

---

## 3. Print Subsystem Integration

Printed documents (Invoices, Settlements, Ledgers) run on a stateless rendering lifecycle. Formatting flags are propagated using the `printConfig` parameter injected through mappers and templates.

### Data Mapper Pattern:
```javascript
export function mapInvoiceToPrint(invoice, printConfig = {}) {
  const symbol = printConfig.currencySymbol || "Rs. ";
  const decimals = typeof printConfig.decimalPlaces === "number" ? printConfig.decimalPlaces : 2;

  return {
    invoiceNumber: invoice.invoiceNumber,
    finalAmount: formatCurrency(invoice.finalAmount, "en", symbol, decimals),
  };
}
```

---

## 4. Arithmetic & Precision Rules

To prevent rounding accumulation errors and inconsistent values:
1. **Never round intermediate calculations**: All backend operations, tax, commission, and labor additions must use raw floating-point calculations inside `@/lib/financial.js`.
2. **Database Integrity**: The database stores raw, high-precision floats. Rounding is solely for visual presentation.
3. **Behavioral Boundary**: `SystemSetting` flags are strictly for UI display and formatting configuration, never for math equations or unit conversions.
