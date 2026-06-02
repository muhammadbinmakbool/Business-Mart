import { getSession } from "./session";
import { canDeleteRecord } from "./permissions";
import { AuthService } from "@/modules/auth/services/AuthService";

/**
 * General-purpose sensitive action guard that enforces session validity,
 * performs a custom role-based capability assertion, and requires
 * local offline password verification.
 * 
 * @param {Object} params
 * @param {string} params.actionName - Human-readable name of the action (e.g. "Delete Intake")
 * @param {string} params.confirmPassword - The password submitted by the operator
 * @param {function} [params.roleCheck] - A pure function taking (sessionRole) and returning boolean
 * @param {function} [params.customAssertion] - A function taking (session) and returning boolean or throwing Error
 * @returns {Promise<Object>} The authenticated operator's session
 */
export async function assertSensitiveAction({
  actionName = "Sensitive Action",
  confirmPassword,
  roleCheck,
  customAssertion
}) {
  const session = await getSession();
  if (!session) {
    throw new Error(`Unauthorized: Active session required for "${actionName}"`);
  }

  // 1. Enforce role capability checks
  if (roleCheck && !roleCheck(session.role)) {
    throw new Error(`Forbidden: You do not have permission to execute "${actionName}"`);
  }

  // 2. Enforce custom assertions (e.g. self-protection or context guards)
  if (customAssertion) {
    await customAssertion(session);
  }

  // 3. Enforce sensitive action offline-safe password verification
  await AuthService.verifyCurrentPassword(confirmPassword);

  return session;
}

/**
 * Asserts that the currently logged-in user possesses record deletion permissions
 * and has verified their identity via password confirmation.
 * @param {string} confirmPassword - Plain-text password for confirmation
 * @returns {Promise<Object>} The authenticated user's session data
 */
export async function assertDeletePermission(confirmPassword) {
  // Enforce administrative destructive deletion settings check
  const { getActivityAuditSettings } = await import("@/lib/settings/activityAuditSettings");
  const settings = await getActivityAuditSettings();
  if (!settings.allowDestructiveDelete) {
    throw new Error("Destructive record deletion is currently disabled in system settings.");
  }

  return assertSensitiveAction({
    actionName: "Delete Record",
    confirmPassword,
    roleCheck: canDeleteRecord
  });
}

/**
 * High-order Server Action wrapper to automatically enforce authorization
 * capability rules, extract confirmation passwords from arguments,
 * and throw clean unified errors on breach.
 * 
 * @param {function} handler - The original Server Action handler
 * @param {Object} options
 * @param {string} options.actionName - Name of the action for audit/logging
 * @param {function} [options.roleCheck] - Stateless capability validation helper
 * @param {boolean} [options.requirePassword=false] - Whether this action triggers re-authentication
 * @returns {function} Wrapped secure Server Action
 */
export function withSecurity(handler, { actionName, roleCheck, requirePassword = false } = {}) {
  return async function wrappedAction(...args) {
    try {
      let confirmPassword = undefined;
      if (requirePassword && args.length > 0) {
        const first = args[0];
        if (first instanceof FormData) {
          confirmPassword = first.get("confirmPassword");
        } else {
          // Extract from the last string parameter (standard deleteActions(id, confirmPassword))
          for (let i = args.length - 1; i >= 0; i--) {
            if (typeof args[i] === "string" && args[i].length > 0 && args[i].length < 100) {
              confirmPassword = args[i];
              break;
            }
          }
        }
      }

      await assertSensitiveAction({
        actionName,
        confirmPassword,
        roleCheck
      });

      return await handler(...args);
    } catch (error) {
      return { error: error.message || "Security authorization failed" };
    }
  };
}
