# Intake Status Reversion Developer Guide

This developer guide documents the data consistency rules, backend service checks, and frontend user interfaces that manage **Intake Status Reversion** (moving from `SOLD` or `CLEARED` back to `PENDING` or `CANCELLED`).

---

## 🏗️ Core Architectural & Operational Rule

**Operational Consistency Rule:**
> If an intake is NOT in `SOLD` or `CLEARED` status, it **cannot** have active sales tracking or billing eligibility.

If an intake status changes:
* `SOLD` ➔ `PENDING`
* `SOLD` ➔ `CANCELLED`
* `CLEARED` ➔ `PENDING`
* `CLEARED` ➔ `CANCELLED`

all related operational consequences must be reverted. This includes:
1. **Inventory Availability**: Re-adding the weight back to standard inventory.
2. **Sales Tracking Availability**: Deleting the associated `SalesTrack` (sales trace) entry atomically.
3. **Billing Eligibility**: Ensuring it is removed from billing/invoice workflows.

---

## 🔒 Consistency Rules

### Rule 1 — Unbilled Trace Reversion (Confirm & Delete)
If the intake has a `SalesTrack` record, but it is **not** billed yet (`isBilled === false` and `saleTransactionId === null`):
* **UI**: Show a highly visible, custom confirmation dialog warning the user of the consequences.
* **Backend**: Upon confirmation, revert the intake status and permanently delete the related `SalesTrack` record atomically within a single database transaction.

### Rule 2 — Already Billed Trace Reversion (Hard Block)
If the intake's `SalesTrack` is already billed or included in a finalized invoice/sale (`isBilled === true` or `saleTransactionId !== null`):
* **UI**: Hard block the action completely. Display an error explaining that the intake is already included in a finalized sale/invoice and instruct the user to remove it from the invoice first.
* **Backend**: Throw a hard error in `IntakeService.updateIntake` to block status mutations, protecting ledger integrity and preventing orphaned invoice references.

---

## 🔧 Backend Implementation

### `IntakeService.updateIntake`

Mutating status away from `SOLD`/`CLEARED` is verified in the database transaction level inside [IntakeService.js](file:///d:/Projects/Next%20JS/src/modules/intake/services/IntakeService.js):

```javascript
// Validation Rule: If transitioning away from SOLD or CLEARED to PENDING or CANCELLED, verify/delete unbilled SalesTrack
if ((oldStatus === "SOLD" || oldStatus === "CLEARED") && (newStatus === "PENDING" || newStatus === "CANCELLED")) {
  const existingTrack = await tx.salesTrack.findUnique({
    where: { intakeTransactionId: current.id }
  });
  if (existingTrack) {
    if (existingTrack.isBilled || existingTrack.saleTransactionId !== null) {
      throw new Error("Cannot change status because this intake's sales trace is already included in a Sales Invoice. Please remove it from the invoice first.");
    }
    // If not billed, delete the SalesTrack record atomically
    await tx.salesTrack.delete({
      where: { id: existingTrack.id }
    });
  }
}
```

---

## 🖥️ User Interface Implementation

Both UI paths that allow changing the status of an intake utilize these checks:

### 1. Status Lifecycle Buttons
Managed in [StatusUpdateButtons.js](file:///d:/Projects/Next%20JS/src/app/intake/%5Bid%5D/StatusUpdateButtons.js):
* Intercepts `handleUpdate` if status transitions to `PENDING` or `CANCELLED` when current status is `SOLD` or `CLEARED`.
* Shows **Unbilled Status Revert Confirmation Modal** if there is an unbilled trace.
* Shows **Billed Status Revert Block Modal** if the trace is already billed.

### 2. Edit Intake Form
Managed in [EditIntakeForm.js](file:///d:/Projects/Next%20JS/src/app/intake/%5Bid%5D/edit/EditIntakeForm.js):
* Uses standard onSubmit handler intercepting save actions.
* Prompts user with identical confirmation and block dialogs before allowing programmatic submission of `updateIntakeAction`.

---

## 🧪 Verification Checklists

### Unbilled Revert Checklist
1. Create an intake.
2. Mark it as `SOLD` to a buyer.
3. Verify that a `SalesTrack` record is created (appears in `/source-tracking` list).
4. Attempt to change status to `PENDING` (either via button or edit form).
5. Verify the warning modal appears detailing what will be deleted.
6. Click "Confirm Revert".
7. Verify that status changes to `PENDING`, `SalesTrack` is deleted, and inventory availability increases.

### Billed Revert Checklist
1. Create an intake.
2. Mark it as `SOLD` to a buyer.
3. Open the Sales Billing module and generate a finalized Sales Invoice containing this sales track.
4. Try to revert the intake's status back to `PENDING` or `CANCELLED`.
5. Verify the blocking modal appears and prevents the operation.
6. Verify the status remains `SOLD` and database data is unchanged.
