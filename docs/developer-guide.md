# Business Mart Developer Guide

## Architecture Overview
Business Mart follows a **Modular Monolith** architecture. Code is organized by business domain (feature-based modules) rather than technical layers.

### Module Structure
Each module in `src/modules/` follows a consistent pattern:
- `controllers/`: Handles incoming requests (Server Actions or API Routes).
- `services/`: Contains business logic and orchestrates data flow.
- `repositories/`: Handles direct database access via Prisma.
- `validations/`: Contains Zod schemas for data validation.
- `types/`: Domain-specific type definitions (if needed).

### Naming Conventions
- **Services**: `[Domain]Service.js` (e.g., `PartyService.js`)
- **Repositories**: `[Domain]Repository.js` (e.g., `PartyRepository.js`)
- **Actions**: `[action][Domain]Action` (e.g., `createPartyAction`)

## Core Principles

### 1. Transaction-Centric Design
All business events (sales, purchases, payments) are treated as immutable transactions. 
- **Derived Balances**: Never store current balances or stock levels in Master Data models (Party, Product). Always calculate them by aggregating transactions.
- **Traceability**: Historical data should never be silently mutated.

### 2. Soft-Disable over Deletion
Master Data (Parties, Products) should use the `isActive` flag for soft-disabling instead of hard deletion to maintain referential integrity with historical transactions.

### 3. Lightweight Services
Keep services focused on business logic. Avoid over-engineering with complex base classes or generic abstractions unless clearly beneficial.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Database**: MSSQL via Prisma ORM
- **Validation**: Zod
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
