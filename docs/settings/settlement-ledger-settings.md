# Settlement & Ledger Settings Subsystem Documentation

The Settlement & Ledger Settings subsystem manages operational configuration flags for the reconciliation process, adjustment visibility, and confirmation behaviors inside Business Mart.

---

## ⚠️ Core Rule: Configuration vs authority

Reconciliation & Ledger calculations are governed entirely by the authority calculation layer under `src/lib/reconciliation.js`.
The Settings Module behaves strictly as a **Behavioral Configuration Layer (Config Only)**.

**SETTINGS MUST NEVER:**
- Replicate, modify, or override comparison formulas or matching rules.
- Direct-calculate matches/mismatches inside UI client modules.
- Mutate ledger double-entry bookkeeping data structures.

---

## 🗄️ Storage Schema & Key

All settings are persisted inside the `SystemSetting` table under the unique key:

```text
settlement_ledger_settings
```

### JSON Schema

```json
{
  "reconciliationTolerance": 1.00,
  "defaultAdjustmentVisibility": {
    "commission": true,
    "labour": true,
    "rent": true,
    "kaat": true
  },
  "autoMarkOutdatedInvoices": true,
  "requireConfirmationBeforeRegeneration": true
}
```

---

## ⚙️ Setting Keys & Behaviors

### 1. Reconciliation Tolerance (`reconciliationTolerance`)
- **Default**: `1.00`
- **Purpose**: Defines the maximum threshold (in Rs.) below which a buyer-supplier billing mismatch is dynamically considered "Matched" on the ledger dashboard.
- **Integration**: Passed dynamically as the `tolerance` argument into the central reconciliation engine (`calculateReconciliationSummary(invoices, sales, tolerance)`). The logic check itself remains inside `src/lib/reconciliation.js`.

### 2. Default Adjustment Visibility (`defaultAdjustmentVisibility`)
- **Default**: `{ "commission": true, "labour": true, "rent": true, "kaat": true }`
- **Purpose**: Governs client-side rendering visibility on preview layers and detail sections.
- **Boundary**: Has no influence on totals calculation; hidden adjustments are still mathematically calculated and deducted.

### 3. Auto Mark Outdated Invoices (`autoMarkOutdatedInvoices`)
- **Default**: `true`
- **Purpose**: Triggers warnings and outdated badges in lists and pages if underlying quantities change. No database state mutation is automatically executed.

### 4. Require Confirmation Before Regeneration (`requireConfirmationBeforeRegeneration`)
- **Default**: `true`
- **Purpose**: Toggles modal safety dialog prompts when regenerating historic invoice periods to prevent unintended overrides.

---

## 🗺️ Integration Flow Diagram

```mermaid
graph TD
    A[Settings Card] -->|Save Settings| B(settingsActions)
    B -->|Upsert Key| C[(SystemSetting DB)]
    C -->|Read Page Load| D(ledger/page.js)
    D -->|Inject as Prop| E[LedgerClient]
    E -->|Pass tolerance parameter| F[src/lib/reconciliation.js]
    F -->|Authority Calculation| G[Match / Mismatch Result]
    G -->|Render State| E
```
