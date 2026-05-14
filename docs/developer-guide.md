# Business Mart Developer Guide

## Core Principle: Sales-Centric POS Architecture
The system is built as a Sales-Centric POS where **Operational Events** drive the state, and **Financial Logic** remains a separate, derived layer.

### 1. Sales as the Operational Event
A `SaleTransaction` is the primary "Stock-Out" event. 
- It is the source of truth for all outgoing inventory.
- It MUST NOT trigger side-effects in the financial settlement or ledger layers.

### 2. Intakes as the Supply Event
An `IntakeTransaction` is the primary "Stock-In" event.
- It records batch availability but does not couple with sales execution.

### 3. Inventory as a Derived Quantity View
Product stock is never stored persistently. It is a **Derived View** calculated in real-time.
- **Rule**: `Total Quantity = Sum(Intakes) - Sum(Sales)`
- This ensures the inventory system remains simple, scalable, and general-purpose POS compatible.

### 4. Separation: Operational vs. Financial
- **Operational Layer**: (Sales, Intakes, Inventory) - Quantity and Event-driven.
- **Financial/Reporting Layer**: (Invoices, Settlements, Ledger) - Derived from joining operational events.
- **Traceability**: An optional metadata link between a Sale and an Intake (Soft Link Only).

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
