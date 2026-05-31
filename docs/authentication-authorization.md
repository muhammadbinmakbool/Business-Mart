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
                └── Prisma Client (Prisma Extensions)
```

---

## 🔑 Session Flow and Middleware

### 1. HTTP-Only Session Cookie
When a user logs in, the `AuthService` generates a stateful token signed with the `JWT_SECRET` key, and sets it in an `HttpOnly`, `Secure`, `SameSite: strict` cookie named `bm-session`.
- **Duration**: 7 Days.
- **Client-Side Safety**: Prevents client-side scripts from reading the token (mitigating XSS).

### 2. Next.js 16 Proxy Router Protection (`src/proxy.js`)
Next.js 16 uses the named `proxy` export inside `src/proxy.js` to handle all middleware request interceptions.
- Protects all routes except `/login`, assets (`_next`), and public APIs.
- Directs unauthenticated users to `/login`.
- Redirects authenticated users from `/login` back to the `/dashboard`.

---

## 🛡️ Automatic Ownership & Audit Trails

To support future multi-business isolation, all 16 primary business models in `schema.prisma` now contain:
- `userId`: Tracks which operator created/edited the record.
- `businessId`: Defaulting to `SYSTEM_BUSINESS_ID = 0` for single-business simplicity.

### Centralized Dynamic Injections (`src/lib/prisma.js`)
We use a **Prisma Client Extension** to automatically inject `userId` and `businessId` on all create, createMany, update, and updateMany queries without touching the service layer files:

```javascript
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const context = await getAuthContext();
        args.data = {
          ...args.data,
          userId: args.data.userId ?? context.userId,
          businessId: args.data.businessId ?? context.businessId,
        };
        return query(args);
      }
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
