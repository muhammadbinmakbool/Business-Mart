"use server";

import { UserService } from "../services/UserService";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/constants";
import { getSession } from "@/lib/session";
import { 
  canManageUserRole, 
  canEditSelfRole, 
  canDisableSelf 
} from "@/lib/permissions";
import { AuthService } from "../services/AuthService";

export async function getActiveSessionAction() {
  return getSession();
}

export async function listUsersAction() {
  try {
    const session = await getSession();
    if (!session || (session.role !== USER_ROLES.SUPER_ADMIN && session.role !== USER_ROLES.ADMIN)) {
      throw new Error("Unauthorized access to user directories");
    }
    const users = await UserService.listUsers();
    return { success: true, users };
  } catch (error) {
    return { error: error.message || "Failed to list users" };
  }
}

export async function createUserAction(formData) {
  const targetRole = formData.get("role") || USER_ROLES.USER;
  const confirmPassword = formData.get("confirmPassword");

  try {
    // 1. Session verification & permissions assertion
    const session = await getSession();
    if (!session) throw new Error("Unauthorized: Session required");

    if (!canManageUserRole(session.role, targetRole)) {
      throw new Error(`Forbidden: Insufficient privileges to create a ${targetRole} operator`);
    }

    // 2. Sensitive operation password verification
    await AuthService.verifyCurrentPassword(confirmPassword);

    const data = {
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
      role: targetRole,
    };

    await UserService.createUser(data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to create user" };
  }
}

export async function updateUserAction(id, formData) {
  const confirmPassword = formData.get("confirmPassword");
  const newRole = formData.get("role");

  try {
    // 1. Session check
    const session = await getSession();
    if (!session) throw new Error("Unauthorized: Session required");

    // 2. Fetch target user role to assert hierarchy
    const targetUser = await UserService.getUser(id);

    // 3. Permission checks
    if (!canManageUserRole(session.role, targetUser.role)) {
      throw new Error("Forbidden: You cannot modify this account");
    }
    if (newRole && !canManageUserRole(session.role, newRole)) {
      throw new Error(`Forbidden: You cannot promote an operator to ${newRole}`);
    }

    // 4. Self-protection check
    if (newRole && !canEditSelfRole(session.userId, id, newRole, targetUser.role)) {
      throw new Error("Forbidden: Lockout protection activated. You cannot change your own role.");
    }

    // 5. Password verification
    await AuthService.verifyCurrentPassword(confirmPassword);

    const data = {};
    const email = formData.get("email");
    const name = formData.get("name");
    const password = formData.get("password");

    if (email) data.email = email;
    if (name) data.name = name;
    if (password) data.password = password;
    if (newRole) data.role = newRole;

    await UserService.updateUser(id, data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update user" };
  }
}

export async function disableUserAction(id, confirmPassword) {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized: Session required");

    const targetUser = await UserService.getUser(id);

    // 1. Permission checks
    if (!canManageUserRole(session.role, targetUser.role)) {
      throw new Error("Forbidden: You cannot disable this operator account");
    }

    // 2. Self-lockout check
    if (!canDisableSelf(session.userId, id)) {
      throw new Error("Forbidden: Lockout protection activated. You cannot disable your own logged-in account.");
    }

    // 3. Password verification
    await AuthService.verifyCurrentPassword(confirmPassword);

    await UserService.disableUser(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to disable user" };
  }
}

export async function enableUserAction(id, confirmPassword) {
  try {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized: Session required");

    const targetUser = await UserService.getUser(id);

    // 1. Permission checks
    if (!canManageUserRole(session.role, targetUser.role)) {
      throw new Error("Forbidden: You cannot enable this operator account");
    }

    // 2. Password verification
    await AuthService.verifyCurrentPassword(confirmPassword);

    await UserService.enableUser(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to enable user" };
  }
}
