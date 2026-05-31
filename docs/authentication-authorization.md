# Authentication & Authorization System

This document outlines the architecture, session management, and role-based authorization rules implemented in Business Mart.

---

## 🎯 Architecture Summary

We use a lightweight, robust, native cookie-based session management system utilizing signed JSON Web Tokens (JWT) via the `jose` library (bundled with Next.js). There are no external database session dependencies, keeping the application fast, edge-compatible, and highly reliable.

### Modular Architecture Flow

```
Client Page (Client Actions) 
    └── Controller Server Actions (src/modules/auth/controllers/)
        └── UserService / AuthService (src/modules/auth/services/)
            └── UserRepository (src/modules/auth/repositories/)
                └── Prisma Client (Pure Data Access Layer)
```

---

## 🔑 Session Flow and Middleware

### 1. HTTP-Only Session Cookie
When a user logs in, the `AuthService` generates a stateful token signed with the `JWT_SECRET` key, and sets it in an `HttpOnly`, `Secure`, `SameSite: strict` cookie named `bm-session`.
- **Duration**: 7 Days.
- **Client-Side Safety**: Prevents client-side scripts from reading the token (mitigating XSS).

### 2. Standard Next.js Middleware Protection (`src/middleware.js`)
We handle all route-level authorization and redirects inside the standard Next.js `src/middleware.js` interceptor.
- Protects all routes except `/login`, static assets (`_next`), and public APIs.
- Directs unauthenticated users to `/login`.
- Redirects authenticated users from `/login` back to the `/dashboard`.

---

## 🛡️ Explicit Ownership & Service-Layer Control

To support future multi-business isolation, all 16 primary business models in `schema.prisma` contain:
- `userId`: Tracks which operator created/edited the record.
- `businessId`: Defaulting to `SYSTEM_BUSINESS_ID = 0` for single-business simplicity.

### Invisible Side-Effects Avoidance
Prisma remains a **pure, transparent data-access layer** with no hidden mutations or query hook interceptors. Ownership is explicitly assigned in the **Service Layer** to preserve full traceability and simplify auditing.

### `withOwnership` Utility (`src/lib/session.js`)
Services fetch the active operator session explicitly using `withOwnership` prior to executing database writes:

```javascript
import { withOwnership } from "@/lib/session";

// Inside Service...
const ownedData = await withOwnership(validatedData);
const record = await ProductRepository.create(ownedData);
```

### ⚠️ Crucial Rule: Nested Relations & Transactions
Since Prisma operates purely as a data-access layer without dynamic interceptors, **all nested creates/updates inside relation maps (e.g., `items.create`, `adjustments.create`) must also explicitly receive `userId` and `businessId` mappings**. 

Failing to explicitly attribute ownership on nested maps will result in those child database rows defaulting silently to `0`. Always enrich nested arrays explicitly using the resolved ownership metadata:

```javascript
const ownership = await withOwnership();

const transaction = await tx.saleTransaction.create({
  data: {
    ...mainData,
    userId: ownership.userId,
    businessId: ownership.businessId,
    items: {
      create: itemsData.map(item => ({
        ...item,
        userId: ownership.userId,
        businessId: ownership.businessId
      }))
    }
  }
});
```

---

## 📊 Global Audit Activity Trails
`emitActivity` dynamically queries the authenticated Next.js session automatically! Any operational event dispatched anywhere in the platform automatically captures the acting operator's `userId` and `userName` without requiring manual parameter passing.

---

## ⚙️ User & Operator Management
Located under **System Settings → Security & Users**, administrators can:
1. Register new operators with custom access roles (`ADMIN` or `USER`).
2. Safely toggle operator status (Active / Disabled) using safe soft-disable actions.
3. Update names, emails, and passwords cleanly.

---

## 🔒 Centralized Role-Based Access Control (RBAC) & Re-Authentication (Version 1)

To ensure high-grade data protection, multi-layered security routing, and robust self-protection safeguards, the platform enforces centralized permission checking.

### 1. Pure Decision Rules (`src/lib/permissions.js`)
All capability evaluations are declared as stateless, network-independent pure functions, ensuring edge-compatibility and local PWA offline autonomy:
- **`canAccessSettings(role)`**: Standard Settings module restricted to `SUPER_ADMIN` and `ADMIN`.
- **`canDeleteRecord(role)`**: Standard deletions restricted to `SUPER_ADMIN` and `ADMIN`.
- **`canManageUserRole(actorRole, targetRole)`**:
  - `SUPER_ADMIN` has absolute operational capability.
  - `ADMIN` can create/manage standard `ADMIN` and `USER` operators.
  - `ADMIN` **cannot** modify or register `SUPER_ADMIN` accounts.
- **`canEditSelfRole(actorId, targetId, newRole, currentRole)`**: Lockout safeguard. Active operator cannot change their own role.
- **`canDisableSelf(actorId, targetId)`**: Lockout safeguard. Active operator cannot disable their own logged-in account.
- **`canDeleteSelf(actorId, targetId)`**: Lockout safeguard. Active operator cannot delete their own account.

### 2. Multi-Layer Page & Routing Guardrails
1. **Next.js Edge Middleware Redirects (`src/middleware.js`)**: Intercepts request paths at network entrance level, instantly bouncing non-admin roles trying to open `/settings`.
2. **React Server Component fallback checks (`src/app/settings/page.js`)**: Secondary client-side RSC verification prior to component renders.
3. **Backend Controller Enforcement (`src/modules/auth/controllers/userActions.js`)**: Re-authenticates every write request against caller's active JWT session roles.

### 3. Unified Deletion Security Guard (`src/lib/authGuard.js`)
To avoid manual logic duplication across deletion controllers, all financial writes and catalog deletions funnel through `assertDeletePermission(confirmPassword)`:
```javascript
export async function assertDeletePermission(confirmPassword) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized: Session required");
  if (!canDeleteRecord(session.role)) throw new Error("Forbidden: Insufficient permissions");
  await AuthService.verifyCurrentPassword(confirmPassword);
  return session;
}
```

### 4. Offline-Safe Password Verification
Sensitive master records, user management adjustments, and high-risk deletion triggers mandate operator re-authentication:
- **Scope**: Required for User management, master catalog deletions (Products/Parties), and financial record deletions (Intakes, Sales, Supplier Invoices, and Settlements). Low-risk temporary data drafts do not block with re-authentication.
- **Offline Integrity**: Authenticating the confirmation password is executed server-side via Node `bcrypt.compare` using local JWT session credentials—meaning the system does not depend on any third-party networks or API servers to verify operator identity.
- **Frontend Interaction**: Captures the password input locally inside the premium overlay `PasswordConfirmModal.jsx` and transmits it via secure parameters to Server Actions.

