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
