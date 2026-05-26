# System-Wide Activity Log Module (Audit Layer) — Developer Guide

This guide documents the design, API, and architectural conventions of the centralized observability layer in the Business Mart ERP.

---

## 🎯 Architecture Philosophy

The **Activity Log Module** acts as an append-only, immutable telemetry layer. It tracks meaningful user-initiated events across the system without affecting operational logic, inventory ledger states, or financial computations.

```
┌──────────────────────┐
│  Core ERP Services   │
│  (Products, Sales,   ├───────┐
│   Intakes, etc.)     │       │
└──────────────────────┘       │ (Synchronous, Awaited outside SQL transactions)
                               ▼
                    ┌─────────────────────┐
                    │     activityLogger  │
                    │   (emitActivity)    │
                    └──────────┬──────────┘
                               │
            (Safe Try-Catch Boundary: No bubbles or crashes)
                               │
                               ▼
                    ┌─────────────────────┐
                    │ ActivityLogService  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ ActivityLogRepo     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    SQL Server DB    │
                    │   (ActivityLog)     │
                    └─────────────────────┘
```

---

## ⚠️ Core Observability Rules

### 1. The Safety Boundary (`await emitActivity`)
To protect against race conditions and process crashes, activity logs **must be awaited** inside current service flows.
However, logging failures must **never** cause the primary business transaction to fail or trigger rollbacks.
* **Implementation:** Always execute `await emitActivity(...)` **outside/after** Prisma database transactions.
* **Safety:** The `emitActivity` dispatcher wraps its database calls in an absolute `try/catch` block that intercepts and gracefully records errors to standard logs without throwing them up to calling business flows.

> [!TIP]
> **Long-Term Scalability Upgrade Path:**
> Currently, calling `await emitActivity(...)` synchronously blocks service flows for index writing safety. If database latency increases in production, this should be upgraded to a **non-blocking asynchronous queue** (e.g., fire-and-forget or background queue pipelines like BullMQ/Redis) so that slow write speeds in the audit log table do not degrade ERP transaction throughput.

### 2. Read-Only Metadata (`meta`)
The `meta` column in `ActivityLog` is stored as an `NVarChar(Max)` string under SQL Server (parsed automatically into objects on fetch).
* **Strict Rule:** **"NO business logic inside meta."**
* The `meta` payload is strictly a read-only snapshot for diagnostics, auditing, and debugging. No inventory tallies, pricing models, ledger reconciliations, or state triggers may rely on properties stored in the `meta` field.

### 3. Strict Event Vocabulary
To avoid vocabulary decay, the logger validates all inputs against standard enums:
* **Entity Types:** `PRODUCT`, `PARTY`, `INTAKE`, `SALE`, `SETTLEMENT`, `SYSTEM`
* **Actions:** `CREATED`, `UPDATED`, `DELETED`, `COMPLETED`, `CANCELLED`, `ARCHIVED`, `SUPERSEDED`, `SOLD`

> [!WARNING]
> **Preventing Action Explosion (Noisy Vocabulary):**
> NEVER expand the `action` enum to include entity context (e.g., do not create `PRODUCT_UPDATED` or `PARTY_UPDATED`). Always keep `action` completely standardized (`UPDATED`, `CREATED`, etc.) and combine it with the `entityType` field to filter.
> 
> * **Correct:** `entityType: "PRODUCT", action: "UPDATED"`
> * **Incorrect:** `entityType: "PRODUCT", action: "PRODUCT_UPDATED"`

---

## 🚀 API Usage Guide

Always import `emitActivity` from `@/modules/activity-log/activityLogger`:

```javascript
import { emitActivity } from "@/modules/activity-log/activityLogger";
```

### 1. Logging Event Creations
```javascript
const intake = await IntakeRepository.create(validated);

await emitActivity({
  entityType: "INTAKE",
  entityId: intake.id,
  action: "CREATED",
  description: `Goods intake ${intake.intakeNumber} recorded`,
  meta: {
    supplierId: intake.partyId,
    productId: intake.productId,
    weight: Number(intake.normalizedWeight),
    bagCount: intake.bagCount
  }
});
```

### 2. Logging Operations outside Transactions
```javascript
// Sale record with complex transaction block
const sale = await prisma.$transaction(async (tx) => {
  // ... core operational billing code
  return sale;
});

// Awaited outside the transactional block!
await emitActivity({
  entityType: "SALE",
  entityId: sale.id,
  action: "CREATED",
  description: `Sale ${sale.saleNumber} recorded`,
  meta: {
    buyerId: sale.partyId,
    totalWeight: Number(sale.totalWeight),
    finalAmount: Number(sale.finalAmount)
  }
});
```

---

## 🧱 Technical Specifications

### Zod Validation Schema
Located at `src/modules/activity-log/validations/activityLogSchema.js`:
```javascript
export const activityLogSchema = z.object({
  entityType: z.enum(["PRODUCT", "PARTY", "INTAKE", "SALE", "SETTLEMENT", "SYSTEM"]),
  entityId: z.number().int().nullable().optional(),
  action: z.enum(["CREATED", "UPDATED", "DELETED", "COMPLETED", "CANCELLED", "ARCHIVED", "SUPERSEDED", "SOLD"]),
  description: z.string().nullable().optional(),
  userId: z.number().int().default(0),
  userName: z.string().nullable().optional().default("system"),
  meta: z.any().optional()
});
```

### Database Columns (Prisma)
```prisma
model ActivityLog {
  id          Int      @id @default(autoincrement())
  entityType  String   @db.NVarChar(100) 
  entityId    Int?
  action      String   @db.NVarChar(100) 
  description String?  @db.NVarChar(Max)
  userId      Int      @default(0)
  userName    String?  @db.NVarChar(255)
  meta        String?  @db.NVarChar(Max)
  createdAt   DateTime @default(now())

  @@index([entityType])
  @@index([action])
  @@index([createdAt])
}
```
