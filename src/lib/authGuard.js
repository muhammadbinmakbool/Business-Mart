import { getSession } from "./session";
import { canDeleteRecord } from "./permissions";
import { AuthService } from "@/modules/auth/services/AuthService";

/**
 * Asserts that the currently logged-in user possesses record deletion permissions
 * and has verified their identity via password confirmation.
 * @param {string} confirmPassword - Plaint-text password for confirmation
 * @returns {Promise<Object>} The authenticated user's session data
 */
export async function assertDeletePermission(confirmPassword) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Active session required");
  }

  // 1. Final authority permission check
  if (!canDeleteRecord(session.role)) {
    throw new Error("Forbidden: You do not have permission to delete records");
  }

  // 2. Sensitive operation password verification
  await AuthService.verifyCurrentPassword(confirmPassword);

  return session;
}
