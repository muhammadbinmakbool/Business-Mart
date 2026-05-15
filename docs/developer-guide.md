# Business Mart Developer Guide

## Core Principle: Sales-Centric POS Architecture
The system is built as a Sales-Centric POS where **Operational Events** drive the state, and **Financial Logic** remains a separate, derived layer.

### 1. Operational vs. Derived Layers
- **Operational Layer (Source of Truth)**: Comprises `IntakeTransaction`, `SaleTransaction`, and `SaleItem`. These record the raw physical and business events.
- **Derived Layer (Reporting/Financial)**: Comprises `Inventory`, `Buyer/Supplier Invoices`, and `Ledgers`. These are calculated from operational events.

### 2. Snapshot Storage Philosophy
While inventory quantity is derived, **Financial Totals** (e.g., `baseAmount`, `finalAmount`) are stored as **Immutable Snapshots** in transactional records.
- **Why?**: For audit history, historical consistency, printing accuracy, and performance reconciliation.
- **Rule**: Storing calculated totals is VALID; storing computed balances (like stock quantity) is NOT.

### 3. Inventory Derivation Rule
Inventory balances are NEVER stored. They are derived in real-time or via optimized aggregations:
- **Available Stock** = `SUM(Intake Gross Weight) - SUM(Sale Item Weight)`
- Only non-cancelled/non-deleted transactions are counted.

### 4. Optional Traceability (The Soft Link)
The system supports optional batch-level traceability for specialized markets (e.g., Grain Markets).
- `SaleItem` may optionally link to an `IntakeTransaction`.
- This linkage must NOT be mandatory. The system must function correctly as a general POS without it.
- **Future Growth**: This link enables advanced profitability analysis and supplier-specific stock tracking in the Derived Layer.

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

## Tech Stack
- **Framework**: Next.js (App Router)
- **Database**: MSSQL via Prisma ORM
- **Validation**: Zod
- **Styling**: Tailwind CSS 4
- **Notifications**: Sonner
- **Icons**: Lucide React

## POS Master Data Rules

### 1. Inline Conditional Master Data Creation
To ensure high-speed POS operations, the system allows creating **Parties (Suppliers/Buyers)** inline within the transaction forms (Intake/Sale).
- **UX Rule**: Triggered only via the "➕ Add New" option in the master data dropdown.
- **Form Rule**: Use contextual field expansion within the same form. **No modals or navigation changes allowed.**
- **Atomic Flow**: The backend handles the creation sequence atomically:
  1. `IF (newPartyData) THEN createParty()`
  2. `Use returned partyId → create Transaction`
- **Supported Fields**: Name, Phone, Address, and Notes.
- **Persistence**: Both Create and Update flows must support this atomic creation to ensure data entry flexibility.

## Developer Workflow
1. **Always update this guide** when making architectural decisions.
2. Maintain strict separation between Operational and Derived layers.
3. Use the `Service -> Repository` pattern for all business logic.
4. Ensure all financial calculations are performed in `financial.js`.
