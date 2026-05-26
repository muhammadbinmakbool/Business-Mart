import { ActivityLogService } from "./services/ActivityLogService";

/**
 * Domain Event Dispatcher for Audit/Telemetry Logging.
 * 
 * CRITICAL ARCHITECTURAL RULES:
 * 1. STRICT TRY-CATCH BOUNDARY:
 *    This function MUST NEVER propagate errors or trigger rollbacks of calling database transactions.
 *    It must always be run outside/after core transaction blocks when possible.
 * 2. NO BUSINESS LOGIC IN META:
 *    The `meta` payload is strictly READ-ONLY debugging context. No business calculations,
 *    inventory triggers, or ledger state mutations should ever depend on the contents of the `meta` field.
 * 3. STANDARDIZED ACTION VOCABULARY:
 *    Always use the strict list of actions: CREATED, UPDATED, DELETED, COMPLETED, CANCELLED, ARCHIVED, SUPERSEDED, SOLD.
 * 
 * @param {Object} params
 * @param {string} params.entityType - PRODUCT, PARTY, INTAKE, SALE, SETTLEMENT, SYSTEM
 * @param {number} [params.entityId] - The ID of the related entity
 * @param {string} params.action - CREATED, UPDATED, DELETED, COMPLETED, CANCELLED, ARCHIVED, SUPERSEDED, SOLD
 * @param {string} [params.description] - Human-readable detail of what occurred
 * @param {number} [params.userId=0] - ID of the acting operator
 * @param {string} [params.userName='system'] - Name fallback of the acting operator
 * @param {Object} [params.meta={}] - Structured, read-only payload for debugging audit trails
 */
export async function emitActivity({
  entityType,
  entityId,
  action,
  description,
  userId = 0,
  userName = "system",
  meta = {}
}) {
  try {
    await ActivityLogService.createLog({
      entityType,
      entityId: entityId ? parseInt(entityId) : null,
      action,
      description,
      userId,
      userName,
      meta
    });
  } catch (error) {
    // Graceful error logging to ensure logging failures never block the parent business transaction
    console.error("ActivityLogger Safety Boundary (gracefully caught):", error);
  }
}
