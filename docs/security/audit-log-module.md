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

### 1. Fire-and-Forget Asynchronous FIFO Queue (Non-Blocking)
To prevent database latency in the logging system from slowing down primary business operations, `emitActivity` pushes logs to an in-memory FIFO queue and returns instantly without awaiting database writes.
* **Non-Blocking Execution:** Calling `await emitActivity(...)` inside service flows does not halt the parent operation or HTTP response. It resolves instantly while sequential database writes happen asynchronously in the background.
* **Strict Try-Catch & Fault Isolation:** Background database write errors are gracefully caught and reported without propagating up to the parent thread or causing business transaction rollbacks.

### 2. Production Stabilization Hardening
The in-memory logging queue is fully hardened against memory leaks, transient network failures, and crash scenarios:
* **Memory Safety & Capping:** The queue is capped to `MAX_QUEUE_SIZE = 10000` logs. If the log volume spikes beyond this limit, new entries are dropped with a warning to protect server memory from exhaustion.
* **Transient Failure Retries:** If the database connection drops temporarily, the background worker retries saving the entry up to `3` times with a `200ms` backoff delay before giving up.
* **Dead-Letter Queue (`failedLogsBuffer`):** Permanent write failures are offloaded to a capped `failedLogsBuffer` (max 500 entries) rather than silently vanishing, keeping them available for system diagnostics.
* **Graceful Exit Hooks (Zero Log Loss on Restart):** Process signals (`SIGTERM` and `SIGINT`) are intercepted. Upon server restart or termination, the logger blocks process termination temporarily to flush all remaining entries in the `logQueue` to the database.

### 3. Read-Only Metadata (`meta`)
The `meta` column in `ActivityLog` is stored as an `NVarChar(Max)` string under SQL Server (parsed automatically into objects on fetch).
* **Strict Rule:** **"NO business logic inside meta."**
* The `meta` payload is strictly a read-only snapshot for diagnostics, auditing, and debugging. No inventory tallies, pricing models, ledger reconciliations, or state triggers may rely on properties stored in the `meta` field.

### 4. Strict Event Vocabulary & Action Normalization
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
