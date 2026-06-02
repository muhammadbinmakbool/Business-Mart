"use server";

import { UserService } from "../services/UserService";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/constants";
import { getSession, isReauthValid } from "@/lib/session";
import { 
  canManageUserRole, 
  canEditSelfRole, 
  canDisableSelf 
} from "@/lib/permissions";
import { assertSensitiveAction } from "@/lib/authGuard";

export async function getActiveSessionAction() {
  return getSession();
}

export async function checkReauthStatusAction() {
  return isReauthValid();
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
    await assertSensitiveAction({
      actionName: "Create Operator",
      confirmPassword,
      customAssertion: (session) => {
        if (!canManageUserRole(session.role, targetRole)) {
          throw new Error(`Forbidden: Insufficient privileges to create a ${targetRole} operator`);
        }
      }
    });

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
  const email = formData.get("email");
  const name = formData.get("name");
  const password = formData.get("password");
  const phoneNumber = formData.get("phoneNumber");
  const address = formData.get("address");

  try {
    const targetUser = await UserService.getUser(id);

    // Only require sensitive re-auth if authentication or role variables are modified
    const isSensitiveUpdate = (email && email !== targetUser.email) ||
                              (name && name !== targetUser.name) ||
                              (newRole && newRole !== targetUser.role) ||
                              (password);

    if (isSensitiveUpdate) {
      await assertSensitiveAction({
        actionName: "Update Operator Profile",
        confirmPassword,
        customAssertion: (session) => {
          if (!canManageUserRole(session.role, targetUser.role)) {
            throw new Error("Forbidden: You cannot modify this account");
          }
          if (newRole) {
            if (!canManageUserRole(session.role, newRole)) {
              throw new Error(`Forbidden: You cannot promote an operator to ${newRole}`);
            }
            if (!canEditSelfRole(session.userId, id, newRole, targetUser.role)) {
              throw new Error("Forbidden: Lockout protection activated. You cannot change your own role.");
            }
          }
        }
      });
    } else {
      const session = await getSession();
      if (!session || (session.role !== USER_ROLES.SUPER_ADMIN && session.role !== USER_ROLES.ADMIN)) {
        throw new Error("Unauthorized access to user profile updates");
      }
      if (!canManageUserRole(session.role, targetUser.role)) {
        throw new Error("Forbidden: You cannot modify this account");
      }
    }

    const data = {};
    if (email) data.email = email;
    if (name) data.name = name;
    if (password) data.password = password;
    if (newRole) data.role = newRole;
    if (formData.has("phoneNumber")) data.phoneNumber = phoneNumber || null;
    if (formData.has("address")) data.address = address || null;

    await UserService.updateUser(id, data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update user" };
  }
}

export async function disableUserAction(id, confirmPassword) {
  try {
    const targetUser = await UserService.getUser(id);

    await assertSensitiveAction({
      actionName: "Disable Operator Account",
      confirmPassword,
      customAssertion: (session) => {
        if (!canManageUserRole(session.role, targetUser.role)) {
          throw new Error("Forbidden: You cannot disable this operator account");
        }
        if (!canDisableSelf(session.userId, id)) {
          throw new Error("Forbidden: Lockout protection activated. You cannot disable your own logged-in account.");
        }
      }
    });

    await UserService.disableUser(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to disable user" };
  }
}

export async function enableUserAction(id, confirmPassword) {
  try {
    const targetUser = await UserService.getUser(id);

    await assertSensitiveAction({
      actionName: "Enable Operator Account",
      confirmPassword,
      customAssertion: (session) => {
        if (!canManageUserRole(session.role, targetUser.role)) {
          throw new Error("Forbidden: You cannot enable this operator account");
        }
      }
    });

    await UserService.enableUser(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to enable user" };
  }
}
