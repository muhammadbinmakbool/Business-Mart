# Business Mart Developer Guide

## Architecture Overview
Business Mart follows a **Modular Monolith** architecture. Code is organized by business domain (feature-based modules) rather than technical layers.

### Module Structure
Each module in `src/modules/` follows a consistent pattern:
- `controllers/`: Handles incoming requests (Server Actions or API Routes).
- `services/`: Contains business logic and orchestrates data flow.
- `repositories/`: Handles direct database access via Prisma.
- `validations/`: Contains Zod schemas for data validation.

## Transaction Philosophy

### 1. Immutability
Transactions are historical facts. Once a Goods Intake or Advance Payment is recorded, it should not be silently modified. Any adjustments should be handled through status changes (e.g., CANCELLED) or separate adjustment entries.

### 2. Derived Balances
**Balances are NEVER stored.**
Current supplier balances and product stock levels must be derived by aggregating transactions.
- `Supplier Balance = (Sum of Purchases) - (Sum of Payments/Advances)`
- `Stock = (Sum of Intakes) - (Sum of Sales)`

### 3. Financial Perspectives (The Middle-Entity Pattern)
Business Mart acts as a bridge between **Suppliers** and **Buyers**. This creates two distinct financial flows for every physical transaction:
- **Buyer Flow (Receivable)**: `Base Product Amount + Additions (Commission, Labour, etc.) = Final Invoice Total`.
- **Supplier Flow (Payable)**: `Base Product Amount - Deductions (Kaat/Weight Deduction, Brokerage, Advances) = Final Settlement Total`.

Financial logic must support these separate perspectives while sharing a common `Base Product Amount` primitive.

### 4. Safety & Traceability (The Operational Safety Layer)
To balance flexibility with correctness, the system implements:
- **Change Tracking**: Every modification (Items, Adjustments, Status) is logged in a `changeLog` JSON field.
- **State Snapshots**: Before an invoice is updated, a `previousState` snapshot (Totals, Counts) is stored to preserve historical context and aid debugging.
- **Status Locking**: `COMPLETED` invoices are locked. Reverting to `PENDING` is required to "unlock" the edit workflow.
- **Financial Boundary**: ONLY `financial.js` is permitted to implement math formulas. All totals are derived from source items/adjustments on every save.
- **Immutable Identifiers**: Primary identifiers like `saleNumber` must never be modified once generated.

## Module: Goods Intake (Step 3)

### Workflow
1. **Intake Creation**: Supplier arrives with goods. We record the `entryDate`, `partyId`, `productId`, `bagCount`, and `grossWeight`.
2. **Sequential Numbering**: The system automatically generates an `intakeNumber` (e.g., `INT-000001`) based on the database ID to ensure human-readable traceability.
3. **Status Lifecycle**:
   - `PENDING`: Goods arrived but not yet settled or processed.
   - `COMPLETED`: Transaction finalized.
   - `CANCELLED`: Entry error or returned goods.

### Inline Advances
For operational efficiency, the Intake form allows recording an immediate `IntakeAdvance` payment. This creates two separate but linked records:
- An `IntakeTransaction`
- An `IntakeAdvance` linked via `intakeTransactionId`

## Database Reference (MSSQL)

### Referential Integrity
Due to MSSQL constraints on multiple cascade paths, relations in `IntakeTransaction` and `IntakeAdvance` use `onUpdate: NoAction` and `onDelete: NoAction`.
- Deleting a Party or Product with existing transactions is restricted to prevent data orphans.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Database**: MSSQL via Prisma ORM
- **Validation**: Zod
- **Styling**: Tailwind CSS 4
- **Notifications**: Sonner
- **Icons**: Lucide React

## Module: Supplier Settlement (Step 4.5)

### Snapshot & Versioning Philosophy
Supplier Settlements use a **Derived Financial Document** pattern. Unlike Intakes or Advances which are **Event Records** (capturing a point-in-time physical or financial event), a Supplier Invoice is a calculated snapshot of multiple events.

1. **Frozen Snapshots**: Once a `SupplierInvoice` is generated, its items (`SupplierInvoiceItem`) store the `weight`, `rate`, and `amount` as frozen values. They do not auto-update if the source `IntakeTransaction` is modified.
2. **Immutability**: Settlement documents are immutable. To correct an error after the source data has changed, a new version must be generated.
3. **Regeneration Workflow**: 
   - If underlying data changes, the invoice is marked `isOutdated = true`.
   - Clicking "Regenerate" marks the current invoice as `SUPERSEDED`.
   - A NEW `SupplierInvoice` record is created with an incremented `version` number and fresh snapshots of the current data.
4. **Lifecycle**:
   - `PENDING`: Initial state, editable/regeneratable.
   - `COMPLETED`: Finalized settlement, locked from further changes.
   - `SUPERSEDED`: Replaced by a newer version, kept for audit history.

### Financial Logic
All math for settlement (Gross Value, Kaat, Brokerage, Net Payable) is centralized in `src/lib/financial.js`. This ensures that the derived document always reflects the system's current financial rules.

### Future Architectural Notes
- **Advance Linking**: Current advance linking is simplified for Phase 1 (direct link to invoice). Future versions may replace this with a bridge/junction model to support partial advance consumption across multiple invoices.
- **Naming Normalization**: To align with business domains, `SaleTransaction` may eventually be renamed to `BuyerInvoice` to match the `SupplierInvoice` pattern.
- **Ledger Dependency**: Future Ledger and Accounting modules will depend ONLY on derived documents (Invoices), not the individual event records.
