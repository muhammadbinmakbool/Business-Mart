# Developer Guide: Deletion & Destructive Mode Architecture

This guide describes the unified two-tier deletion mechanism (Soft Delete & Hard Delete) and the Settings-based Destructive Mode controls in Business Mart ERP.

---

## 1. Architectural Design

The system enforces a **two-tier deletion strategy**:
1. **Soft Delete (Default)**: Set `isDeleted = true` along with timestamps and reason. Records remain in the database but are hidden from normal query operations using `{ isDeleted: false }` filters.
2. **Hard Delete (Destructive Mode)**: Physical deletion of the record from the database. Guarded by an active session token created via the settings panel.

---

## 2. User Interface Rules

### Always-Visible Delete Actions & Passwordless Warnings
- Delete actions (buttons/icons) **must always be visible** to authorized roles (`ADMIN` or `SUPER_ADMIN`) across all registries, lists, and detail views.
- **Do not gate visibility** of delete controls using general settings or active/inactive session states.
- Password authentication is **completely removed** from individual delete action triggers to streamline operations. Instead, a simple confirmation modal with a descriptive warning is shown.
- The button behavior, label, and confirmatory steps switch dynamically based on the Destructive Mode session status:

| Destructive Mode Status | UI Trigger Label | Action Invoked | Confirmation Prompt |
| :--- | :--- | :--- | :--- |
| **Inactive** (Default) | `Delete` | `deleteXAction` | Warning modal: 'Yes, Delete' and 'Cancel' |
| **Active** (Destructive) | `Permanently Delete` | `hardDeleteXAction` | Permanent DB purge warning modal: 'Yes, Permanently Delete' and 'Cancel' |

---

## 3. Destructive Mode Session Lifecycle

### Activation & Deactivation
- The entry point to Destructive Mode is the **"Allow Destructive Deletes"** switch located under **Settings -> Activity & Audit Settings**.
- **User dropdown menu toggle is removed** to keep configurations centralized.
- **Activation Flow**:
  1. User toggles the switch to **ON**.
  2. The interface displays the password confirmation modal.
  3. Upon entering the admin credentials, `enterDestructiveModeAction` sets the HttpOnly `bm-destructive` JWT session cookie (expires in 10 minutes).
  4. A persistent red banner (`<DestructiveModeBanner>`) appears at the top of the viewport with a live countdown timer.
- **Deactivation Flow**:
  1. User toggles the switch to **OFF** OR clicks **"Exit Destructive Mode"** in the top banner OR the 10-minute timer expires.
  2. The session cookie is cleared, the banner is removed, and the Settings switch automatically reverts to the **OFF** state.

---

## 4. Codebase Reference

### Core Components
- `src/components/DeleteButton.js`: Handles dynamic rendering, labeling, and conditional execution of soft vs. hard deletes with standard warning modals.
- `src/components/layout/Topbar.js`: Renders the active banner and avatar highlighting.
- `src/app/settings/ActivityAuditSettingsCard.js`: Binds the settings switch directly to the active session.

### Wired Pages & Lists
- **Parties List** (`src/app/parties/PartyListClient.js`)
- **Products List** (`src/app/products/ProductListClient.js`)
- **Intake Details** (`src/app/intake/[id]/page.js`)
- **Sales Details** (`src/app/sales/[id]/page.js`)
- **Supplier Invoice Details** (`src/app/supplier-invoices/[id]/page.js`)
- **Ledger Reconciliation List & Details** (`src/app/ledger/LedgerClient.js`)

---

## 5. Detailed Git Commit Reference

Use the following detailed commit message to commit these changes to version control:

```bash
git commit -m "refactor(ui,auth): always show delete actions and bind destructive mode to settings toggle

- Refactor DeleteButton component to ensure visibility of delete actions for authorized administrators at all times.
- Dynamically toggle button labels between 'Delete' and 'Permanently Delete' and actions between soft/hard delete based on the Destructive Mode session status.
- Remove the legacy 'Enter Destructive Mode' toggle from the user profile dropdown inside Topbar.
- Bind the 'Allow Destructive Deletes' settings switch under Activity & Audit settings to directly toggle active sessions.
- Map hardDeleteAction routes to Intake details, Sale details, Supplier Invoice details, and Ledger reconciliation history/details.
- Validate Next.js production builds and verify complete soft/hard delete flows in the browser."
```
