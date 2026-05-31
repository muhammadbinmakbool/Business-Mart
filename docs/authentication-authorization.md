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
