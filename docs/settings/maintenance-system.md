# System Maintenance & Backups Subsystem

The Maintenance subsystem provides administrative operations to export/restore full databases, reset demo environments, clean up logs, and perform idempotent recalculations of inventory stock and ledger period summaries.

---

## 🏗️ Architectural Core

The subsystem is implemented as an infrastructure/maintenance tool layer that sits on top of existing services and the Prisma client:

```text
src/modules/maintenance/
 ├── controllers/
 │    └── maintenanceActions.js    # Next.js Server Actions with admin session checks
 ├── services/
 │    └── MaintenanceService.js    # Core database serialization, restore, and resets
 ├── validations/
 │    └── maintenanceSchema.js     # Zod structural validation schemas
 └── ui/
      ├── BackupTab.js
      ├── RestoreTab.js
      ├── ImportDataTab.js
      ├── ResetSystemTab.js
      ├── InventoryToolsTab.js
      ├── LedgerToolsTab.js
      └── LogsCleanupTab.js
```

---

## 🗄️ Relational Constraints & Order of Operations

To prevent database integrity errors and SQL Server foreign key violations, delete and insert operations must execute in a strict dependency sequence:

### Delete Order (Reverse Dependency)
1. `PartyPaymentAllocation`
2. `PartyPayment`
3. `SupplierInvoiceAdjustment`
4. `SupplierInvoiceItem`
5. `SupplierInvoice`
6. `TransactionAdjustment`
7. `SalesTrack`
8. `SaleItem`
9. `SaleTransaction`
10. `IntakeAdvance`
11. `IntakeTransaction`
12. `ProductRate`
13. `Product`
14. `Party`
15. `ActivityLog`
16. `LedgerSession`
17. `SystemSetting`
18. `User`

### Insert Order (Dependency Hierarchy)
The exact opposite order is followed during full system restores.

---

## ⚡ SQL Server Identity Insert & Atomicity

To restore a relational backup while preserving all original references (`productId`, `partyId`, etc.), original primary keys (`id`) must be preserved. 

1. **`SET IDENTITY_INSERT`**: SQL Server requires explicit permission to overwrite identity columns. This is handled by running `SET IDENTITY_INSERT [TableName] ON` before inserting data, and disabling it afterward.
2. **Database Transaction**: All delete and insert steps run inside a single `prisma.$transaction`. If any operation fails, the database is rolled back to its original state, avoiding partial or corrupted restores.

---

## 🔄 Idempotency Guarantees

### 1. Inventory Recalculation
Rebuilds physical product stock counts by summing normalized remaining weights of all active intakes:
- Formula: `Product.quantity = SUM(normalized remaining weight)` of pending/partial intakes.
- It is fully idempotent because running it 1 or 10 times results in the exact same calculated quantity.

### 2. Ledger Snapshot Rebuilds
Recalculates reconciliation totals (`supplierTotal`, `buyerTotal`, etc.) of saved sessions using active invoice and transaction records. It does not alter dates or status, only recalculating values for the specified date range.

---

## 🔒 Safety Measures
- **Authorisation Checks**: All Server Actions call `assertAdmin()` which retrieves the session via `getSession()` and verifies the role using `canAccessSettings(role)`.
- **Destructive Warning Prompt**: Restores and resets require typing a validation keyword (`RESTORE` or `RESET`) in a confirmation modal.
- **Audit Trails**: Every backup, restore, reset, recalculation, and cleanup action is written to the system audit trail using `emitActivity()`.
