# Business Mart Developer Guide

## Core Principle: Clean POS Model
The system enforces a strict separation between **Physical Stock (Operational)** and **Financial/Reporting (Derived)** layers.

### 1. Sale as Stock-Out Event
A `SaleTransaction` is defined strictly as an operational **Stock-Out** event.
- It records **what** left (Product), **how much** (Weight), **when** (Entry Date), and **at what rate** (Operational Price).
- It MUST NOT be coupled with inventory batches, supplier identities, or quality classifications at the database level.

### 2. Inventory Derivation Rule
Inventory balances are NEVER stored. They are derived in real-time using the following formula:
- **Available Stock** = `SUM(Intake Gross Weight) - SUM(Sale Item Weight)`
- Only transactions with non-cancelled statuses are included in this derivation.

### 3. Layer Separation
- **Inventory Layer**: Strictly quantity-based (Product + Quantity). Pure operational source of truth.
- **Financial/Reporting Layer**: (Future) Handles supplier settlements, buyer groupings, and profitability analysis by joining transaction events with business rules. This layer must not write back to or pollute the Inventory Layer.

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
