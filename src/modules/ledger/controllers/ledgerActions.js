"use server";

import { revalidatePath } from "next/cache";
import { LedgerService } from "../services/LedgerService";
import { invalidateCacheBucket } from "@/modules/aggregations/cache";

/**
 * Action to fetch live reconciliation details.
 */
export async function getLiveReconciliationAction(filters = {}) {
  try {
    const data = await LedgerService.getLiveReconciliationData(filters);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch live reconciliation data:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Action to fetch live reconciliation summary.
 */
export async function getLiveReconciliationSummaryAction(filters = {}) {
  try {
    const data = await LedgerService.getLiveReconciliationSummary(filters);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch live reconciliation summary:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Action to save a reconciliation snapshot session.
 */
export async function createLedgerSessionAction(data) {
  try {
    const session = await LedgerService.createSession(data);
    revalidatePath("/ledger");
    invalidateCacheBucket("ledger");
    return { success: true, data: session };
  } catch (error) {
    console.error("Failed to create ledger session snapshot:", error);
    return { success: false, error: error.message };
  }
}

export async function listLedgerSessionsAction({ page, limit, searchQuery } = {}) {
  try {
    if (page !== undefined || limit !== undefined || searchQuery !== undefined) {
      const result = await LedgerService.listSessionsPaginated({ page, limit, searchQuery });
      return { success: true, ...result };
    }
    const sessions = await LedgerService.listSessions();
    return { success: true, data: sessions };
  } catch (error) {
    console.error("Failed to list saved ledger sessions:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Action to fetch detailed information of a saved session.
 */
export async function getLedgerSessionDetailsAction(id) {
  try {
    const details = await LedgerService.getSessionDetails(id);
    return { success: true, data: details };
  } catch (error) {
    console.error(`Failed to fetch ledger session ${id} details:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Action to toggle the soft locking status of a session.
 */
export async function toggleLockSessionAction(id) {
  try {
    const updated = await LedgerService.toggleLockSession(id);
    revalidatePath("/ledger");
    invalidateCacheBucket("ledger");
    return { success: true, data: updated };
  } catch (error) {
    console.error(`Failed to toggle lock for session ${id}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Action to soft-delete a session.
 */
export async function deleteLedgerSessionAction(id, deleteReason) {
  try {
    const result = await LedgerService.deleteSession(id, deleteReason);
    revalidatePath("/ledger");
    invalidateCacheBucket("ledger");
    return { success: true, data: result };
  } catch (error) {
    console.error(`Failed to delete session ${id}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Action to PERMANENTLY delete a session (requires Destructive Mode).
 */
export async function hardDeleteLedgerSessionAction(id, force = false, deleteReason) {
  try {
    const result = await LedgerService.hardDeleteSession(id, force, deleteReason);
    revalidatePath("/ledger");
    invalidateCacheBucket("ledger");
    return { success: true, data: result };
  } catch (error) {
    console.error(`Failed to permanently delete session ${id}:`, error);
    return { success: false, error: error.message };
  }
}
