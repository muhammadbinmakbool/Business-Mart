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
1. **❗ Exclusivity of Arithmetic Rounding (GUARANTEE)**: **ALL mathematical and financial rounding MUST happen ONLY inside `@/lib/financial.js`**. No React UI component, page, frontend helper, or print subsystem mapper is ever allowed to perform arithmetic rounding or decimal truncation logic.
2. **Database & Memory State Integrity**: The database and application memory stores must maintain raw, high-precision floats. Rounding must happen solely at the final UI rendering or print generation stage.
3. **Behavioral Boundary**: `SystemSetting` flags are strictly for UI display and formatting configuration, never for math equations or unit conversions.
4. **Print Subsystem Integration Constraint**: The `printConfig` parameters passed through the print template resolution pipeline are configuration-only transport objects. They **MUST NOT** implement or override custom formatting logic. All print template and mapper formatting must consume the central `formatCurrency` utility.
5. **React Context Optimization**: To avoid performance degradation and excessive re-renders (over-hooking), do not call `useSettings()` inside low-level child components/widgets. Retrieve values at the top-level container or client-page component and pass them down as props.

