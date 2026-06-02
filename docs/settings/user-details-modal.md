# User Details Modal Developer Guide

This document details the architectural layout, implementation details, database schema, and UI behavior for the **User Profile Details Modal** settings tab addition.

---

## 1. Core Architecture & Design Rules

The User Details Modal is designed as a secure, non-disruptive contact profile manager:
- **Zero Auth System Modifiers**: This profile extension does not modify the `authSchema.js` validations, login scripts, session lifetimes, or JWT structures.
- **Visual Integrity**: The existing Users list table UI remains completely intact and unmodified.
- **Conditional Password Re-authorization**: 
  - Modifications containing ONLY profile contact details (`phoneNumber` or `address`) skip the administrator password re-verification popup.
  - Sensitive changes (modifying name, email, roles, or password changes) continue to trigger the full `assertSensitiveAction` password re-verification screen.

---

## 2. Directory and File Structure

The implementation is integrated into the existing modules:

```
docs/settings/
├── adjustments-visibility-control.md       # Technical guide for visibility settings
├── default-product-season-settings.md      # Technical guide for defaults settings
└── user-details-modal.md                   # Technical guide for user details modal (this file)
prisma/
└── schema.prisma                           # Extended User model (phoneNumber, address)
src/
├── app/
│   └── settings/
│       └── UsersManagement.js              # Users management list and UserDetailsModal integration
├── modules/
│   └── auth/
│       ├── controllers/
│       │   └── userActions.js              # Server Action: updateUserAction
│       ├── repositories/
│       │   └── UserRepository.js           # select query phoneNumber / address column fields
│       └── services/
│           └── UserService.js              # UserService.updateUser handles phoneNumber / address
```

---

## 3. Database Schema

The `User` model is extended with two nullable columns:
```prisma
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  name        String?
  password    String   @db.NVarChar(255)
  role        String   @default("USER") // ADMIN | USER
  isActive    Boolean  @default(true)
  phoneNumber String?
  address     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 4. Backend Service and Server Action Integration

### 4.1 UserRepository select updates
`UserRepository.js` includes the new columns in its select payloads during query and mutations operations:
```javascript
select: {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  phoneNumber: true,
  address: true,
  createdAt: true,
  updatedAt: true,
}
```

### 4.2 UserService update mapping
`UserService.updateUser` splits off the newly introduced profile fields prior to schema validation:
```javascript
  static async updateUser(id, data) {
    const { phoneNumber, address, ...rest } = data;
    const validated = updateUserSchema.parse(rest);

    const updateData = {};
    // ...
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address !== undefined) updateData.address = address;
    // ...
```

### 4.3 userActions conditional bypass
`updateUserAction` in `userActions.js` evaluates if the incoming payload contains sensitive variables. If none are present, `assertSensitiveAction` is bypassed to avoid presenting password prompt popups:
```javascript
    const isSensitiveUpdate = (email && email !== targetUser.email) ||
                              (name && name !== targetUser.name) ||
                              (newRole && newRole !== targetUser.role) ||
                              (password);
```

---

## 5. Frontend UI Modal Integration

- Renders inside `/settings?tab=security`.
- Clicking the **View Details** button on any user row triggers `handleOpenDetails(user)` and displays the Details modal.
- Integrates `isModalEditMode` state switches:
  - **Read mode**: Renders profile values or "Not Set" indicators. Shows **Edit Profile** and **Close** controls.
  - **Edit mode**: Shows inline text inputs and textareas for Phone Number and Address, along with **Save Changes** and **Cancel** buttons.
- On save, `handleSaveDetails` sends a `FormData` payload containing the profile fields via `updateUserAction`, triggers a toast, closes the modal, and calls `fetchUsers()` to update the main settings list table view.
