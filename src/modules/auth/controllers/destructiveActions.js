"use server";

import { getSession } from "@/lib/session";
import { canDeleteRecord } from "@/lib/permissions";
import { AuthService } from "@/modules/auth/services/AuthService";
import {
  createDestructiveSession,
  deleteDestructiveSession,
  validateDestructiveSession,
  DESTRUCTIVE_SESSION_MINUTES,
} from "@/lib/destructiveSession";
import { emitActivity } from "@/modules/activity-log/activityLogger";

/**
 * Enters Destructive Mode for the current admin user.
 * Requires role verification and offline password confirmation.
 * Grants a time-limited privileged session (default 10 minutes).
 *
 * @param {string} password - The admin's current password for confirmation
 * @param {string} [reason] - Optional reason for entering destructive mode
 */
export async function enterDestructiveModeAction(password, reason = "") {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized: No active session." };
    }

    if (!canDeleteRecord(session.role)) {
      return { success: false, error: "Forbidden: Only administrators may enter Destructive Mode." };
    }

    if (!password || password.trim() === "") {
      return { success: false, error: "Password confirmation is required." };
    }

    // Verify identity via offline password check
    await AuthService.verifyCurrentPassword(password);

    // Grant the destructive session
    await createDestructiveSession(session.userId);

    // Audit the activation
    await emitActivity({
      entityType: "SYSTEM",
      entityId: session.userId,
      action: "DESTRUCTIVE_MODE_ENABLED",
      description: `Admin "${session.userName}" entered Destructive Mode.${reason ? ` Reason: ${reason}` : ""}`,
      userId: session.userId,
      userName: session.userName,
      meta: JSON.stringify({ reason: reason || null, expiresInMinutes: DESTRUCTIVE_SESSION_MINUTES }),
    });

    return {
      success: true,
      message: `Destructive Mode is now active for ${DESTRUCTIVE_SESSION_MINUTES} minutes.`,
      expiresInMinutes: DESTRUCTIVE_SESSION_MINUTES,
    };
  } catch (error) {
    return { success: false, error: error.message || "Failed to enter Destructive Mode." };
  }
}

/**
 * Exits Destructive Mode immediately, revoking the privileged session.
 */
export async function exitDestructiveModeAction() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized: No active session." };
    }

    await deleteDestructiveSession();

    // Audit the deactivation
    await emitActivity({
      entityType: "SYSTEM",
      entityId: session.userId,
      action: "DESTRUCTIVE_MODE_DISABLED",
      description: `Admin "${session.userName}" exited Destructive Mode.`,
      userId: session.userId,
      userName: session.userName,
    });

    return { success: true, message: "Destructive Mode has been deactivated." };
  } catch (error) {
    return { success: false, error: error.message || "Failed to exit Destructive Mode." };
  }
}

/**
 * Returns whether Destructive Mode is currently active for the authenticated user.
 * Safe to call from any client component.
 */
export async function getDestructiveModeStatusAction() {
  try {
    const session = await getSession();
    if (!session) return { active: false };

    if (!canDeleteRecord(session.role)) return { active: false };

    const payload = await validateDestructiveSession(session.userId);
    if (!payload) return { active: false };

    // Calculate remaining time in seconds
    const expiresAt = payload.exp * 1000; // JWT exp is in seconds
    const remainingMs = expiresAt - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return {
      active: remainingSeconds > 0,
      remainingSeconds,
      expiresAt,
    };
  } catch {
    return { active: false };
  }
}
