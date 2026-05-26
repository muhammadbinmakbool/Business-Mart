import { ActivityLogService } from "./services/ActivityLogService";

const logQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || logQueue.length === 0) return;
  isProcessing = true;

  try {
    while (logQueue.length > 0) {
      const nextLog = logQueue.shift();
      try {
        await ActivityLogService.createLog(nextLog);
      } catch (error) {
        // Individual item write failures must not halt the queue processing
        console.error("ActivityLogger Background Worker failed to save log item:", error, nextLog);
      }
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Domain Event Dispatcher for Audit/Telemetry Logging.
 * 
 * CRITICAL ARCHITECTURAL RULES:
 * 1. FIRE-AND-FORGET BACKGROUND QUEUE:
 *    To prevent audit logging latency from slowing down primary business operations,
 *    emitActivity pushes logs to a background FIFO queue and returns instantly without awaiting database writes.
 * 2. STRICT TRY-CATCH BOUNDARY:
 *    This function MUST NEVER propagate errors or trigger rollbacks of calling database transactions.
 * 3. NO BUSINESS LOGIC IN META:
 *    The `meta` payload is strictly READ-ONLY debugging context. No business calculations,
 *    inventory triggers, or ledger state mutations should ever depend on the contents of the `meta` field.
 * 4. STANDARDIZED ACTION VOCABULARY:
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
  // 1. Queue the sanitized operational log entry
  logQueue.push({
    entityType,
    entityId: entityId ? parseInt(entityId) : null,
    action,
    description,
    userId,
    userName,
    meta
  });

  // 2. Trigger background queue worker asynchronously without awaiting
  processQueue().catch(err => {
    console.error("ActivityLogger Background Queue Processor encountered critical failure:", err);
  });
}
