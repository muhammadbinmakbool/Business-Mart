import { ActivityLogService } from "./services/ActivityLogService";
import { getSession } from "@/lib/session";
import { SYSTEM_BUSINESS_ID, USER_ROLES } from "@/lib/constants";
import { ApplicationLogger } from "@/lib/logger";

/**
 * Enhanced Domain Event Dispatcher that automatically attributes acting user
 * and businessId from the request session, falling back to system defaults.
 */
export async function emitUserActivity(params) {
  let userId = 0;
  let userName = USER_;
  let businessId = SYSTEM_BUSINESS_ID;

  try {
    const session = await getSession();
    if (session) {
      userId = session.userId || 0;
      userName = session.userName || USER_ROLES.SYSTEM;
    }
  } catch (error) {
    // Session context not available (e.g. background job or system task)
  }

  return emitActivity({
    ...params,
    userId,
    userName,
    businessId,
  });
}

const logQueue = [];
const failedLogsBuffer = [];

// Hardened Stability Limits
const MAX_QUEUE_SIZE = 10000;
const MAX_FAILED_BUFFER_SIZE = 500;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 200;

let isProcessing = false;

// Helper function to sleep (used for retry backoffs)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processQueue() {
  if (isProcessing || logQueue.length === 0) return;
  isProcessing = true;

  try {
    while (logQueue.length > 0) {
      const nextLog = logQueue.shift();
      let success = false;
      let attempts = 0;

      // Safe retry loop
      while (attempts < MAX_RETRIES && !success) {
        attempts++;
        try {
          await ActivityLogService.createLog(nextLog);
          success = true;
        } catch (error) {
          ApplicationLogger.error(
            `ActivityLogger: Save attempt ${attempts}/${MAX_RETRIES} failed for entity ${nextLog.entityType} (ID: ${nextLog.entityId})`,
            error
          );
          
          if (attempts < MAX_RETRIES) {
            await delay(RETRY_DELAY_MS);
          }
        }
      }

      // Safe Dead-Letter buffer transition on permanent failure
      if (!success) {
        ApplicationLogger.error("ActivityLogger: Log permanently failed to save. Offloading to dead-letter buffer", new Error(JSON.stringify(nextLog)));
        
        if (failedLogsBuffer.length >= MAX_FAILED_BUFFER_SIZE) {
          // Drop oldest failed log to avoid memory growth leak
          failedLogsBuffer.shift();
        }
        
        failedLogsBuffer.push({
          log: nextLog,
          failedAt: new Date(),
          totalAttempts: attempts
        });
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
 * 2. MEMORY AND CRASH SAFETY HARDENING:
 *    - Cap logQueue size to prevent Out-Of-Memory crashes under heavy operational bursts.
 *    - Process exit hooks SIGTERM/SIGINT capture and attempt to flush remaining logQueue.
 *    - Silent failure prevention via database save retry cycles and dead-letter queue buffering.
 * 3. STRICT TRY-CATCH BOUNDARY:
 *    This function MUST NEVER propagate errors or trigger rollbacks of calling database transactions.
 * 4. NO BUSINESS LOGIC IN META:
 *    The `meta` payload is strictly READ-ONLY debugging context. No business calculations,
 *    inventory triggers, or ledger state mutations should ever depend on the contents of the `meta` field.
 * 5. STANDARDIZED ACTION VOCABULARY:
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
  userId,
  userName,
  businessId,
  meta = {}
}) {
  if (action === "UPDATED") {
    try {
      const { getActivityAuditSettings } = await import("@/lib/settings/activityAuditSettings");
      const settings = await getActivityAuditSettings();
      if (!settings.trackEdits) {
        return;
      }
    } catch (e) {
      // Ignore settings fetch error to preserve fallback log behavior
    }
  }

  let resolvedUserId = userId;
  let resolvedUserName = userName;
  let resolvedBusinessId = businessId !== undefined ? businessId : SYSTEM_BUSINESS_ID;

  if (resolvedUserId === undefined || resolvedUserName === undefined) {
    try {
      const session = await getSession();
      if (session) {
        if (resolvedUserId === undefined) resolvedUserId = session.userId || 0;
        if (resolvedUserName === undefined) resolvedUserName = session.userName || USER_ROLES.SYSTEM;
      }
    } catch (e) {
      // Cookies/session not available in this context
    }
  }

  // Fallbacks
  if (resolvedUserId === undefined) resolvedUserId = 0;
  if (resolvedUserName === undefined) resolvedUserName = USER_ROLES.SYSTEM;
  // 1. Queue memory growth safety cap check (Overflow handling)
  if (logQueue.length >= MAX_QUEUE_SIZE) {
    console.warn(
      `ActivityLogger CRITICAL WARNING: In-memory queue limit of ${MAX_QUEUE_SIZE} hit. ` +
      `Dropping log entry to protect server memory:`, 
      { entityType, action, description }
    );
    return;
  }

  // 2. Queue the sanitized operational log entry
  logQueue.push({
    entityType,
    entityId: entityId ? parseInt(entityId) : null,
    action,
    description,
    userId: resolvedUserId,
    userName: resolvedUserName,
    businessId: resolvedBusinessId,
    meta
  });

  // 3. Trigger background queue worker asynchronously without awaiting
  processQueue().catch(err => {
    ApplicationLogger.error("ActivityLogger Background Queue Processor encountered critical failure", err);
  });
}

// Graceful Shutdown Handler
async function gracefulShutdown() {
  if (logQueue.length > 0) {
    console.log(`ActivityLogger: Shutdown initiated. Processing remaining ${logQueue.length} logs before exit...`);
    try {
      // Force sequential database write of all remaining entries
      await processQueue();
      console.log("ActivityLogger: Graceful flush completed. All logs written to database.");
    } catch (err) {
      ApplicationLogger.error("ActivityLogger: Graceful shutdown flush failed", err);
    }
  }
}

// Register process exit listener hooks
if (typeof process !== "undefined") {
  process.once("SIGTERM", async () => {
    await gracefulShutdown();
    process.exit(0);
  });
  
  process.once("SIGINT", async () => {
    await gracefulShutdown();
    process.exit(0);
  });
}

/**
 * Log party-related event.
 */
export async function logPartyEvent({
  partyId,
  partyName,
  action,
  description,
  performedByUserId = 0,
  performedByName = "system",
  meta = {}
}) {
  return emitActivity({
    entityType: "PARTY",
    entityId: partyId,
    action,
    description,
    userId: performedByUserId,
    userName: performedByName,
    meta: {
      partyId,
      partyName,
      ...meta
    }
  });
}

/**
 * Log sale-related event.
 */
export async function logSaleEvent({
  saleId,
  saleNumber,
  partyId,
  partyName,
  action,
  description,
  amount,
  performedByUserId = 0,
  performedByName = "system",
  meta = {}
}) {
  return emitActivity({
    entityType: "SALE",
    entityId: saleId,
    action,
    description,
    userId: performedByUserId,
    userName: performedByName,
    meta: {
      saleId,
      saleNumber,
      partyId,
      partyName,
      amount: amount !== undefined ? Number(amount) : undefined,
      ...meta
    }
  });
}

/**
 * Log intake-related event.
 */
export async function logIntakeEvent({
  intakeId,
  intakeNumber,
  partyId,
  partyName,
  action,
  description,
  weight,
  bagCount,
  rate,
  performedByUserId = 0,
  performedByName = "system",
  meta = {}
}) {
  return emitActivity({
    entityType: "INTAKE",
    entityId: intakeId,
    action,
    description,
    userId: performedByUserId,
    userName: performedByName,
    meta: {
      intakeId,
      intakeNumber,
      partyId,
      partyName,
      weight: weight !== undefined ? Number(weight) : undefined,
      bagCount: bagCount !== undefined ? Number(bagCount) : undefined,
      rate: rate !== undefined ? Number(rate) : undefined,
      ...meta
    }
  });
}

/**
 * Log supplier settlement-related event.
 */
export async function logSettlementEvent({
  settlementId,
  invoiceNumber,
  partyId,
  partyName,
  action,
  description,
  amount,
  performedByUserId = 0,
  performedByName = "system",
  meta = {}
}) {
  return emitActivity({
    entityType: "SETTLEMENT",
    entityId: settlementId,
    action,
    description,
    userId: performedByUserId,
    userName: performedByName,
    meta: {
      settlementId,
      invoiceNumber,
      partyId,
      partyName,
      amount: amount !== undefined ? Number(amount) : undefined,
      ...meta
    }
  });
}

/**
 * Log payment-related event (stored under entityType PARTY).
 */
export async function logPaymentEvent({
  partyId,
  partyName,
  paymentType,
  eventType,
  amount,
  description,
  performedByUserId = 0,
  performedByName = "system",
  referenceType,
  referenceId,
  referenceNumber,
  meta = {}
}) {
  return emitActivity({
    entityType: "PARTY",
    entityId: partyId,
    action: "UPDATED",
    description,
    userId: performedByUserId,
    userName: performedByName,
    meta: {
      partyId,
      partyName,
      paymentType,
      eventType,
      amount: amount !== undefined ? Number(amount) : undefined,
      referenceType,
      referenceId: referenceId !== undefined && referenceId !== null ? parseInt(referenceId) : undefined,
      referenceNumber,
      ...meta
    }
  });
}
