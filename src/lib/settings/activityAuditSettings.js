import { prisma } from "@/lib/prisma";

export const DEFAULT_ACTIVITY_AUDIT_SETTINGS = {
  logRetentionDays: 30,
  trackEdits: true,
  showDeletedRecords: false,
  allowDestructiveDelete: false
};

/**
 * Fetches the system activity & audit settings from the database, merging them with standard default values.
 * 
 * @returns {Promise<object>} The resolved activity & audit settings object.
 */
export async function getActivityAuditSettings() {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "activity_audit_settings" }
    });
    
    if (!record) {
      return DEFAULT_ACTIVITY_AUDIT_SETTINGS;
    }
    
    const parsed = JSON.parse(record.value);
    
    return {
      logRetentionDays: parsed.logRetentionDays !== undefined ? parseInt(parsed.logRetentionDays, 10) : DEFAULT_ACTIVITY_AUDIT_SETTINGS.logRetentionDays,
      trackEdits: parsed.trackEdits !== undefined ? !!parsed.trackEdits : DEFAULT_ACTIVITY_AUDIT_SETTINGS.trackEdits,
      showDeletedRecords: parsed.showDeletedRecords !== undefined ? !!parsed.showDeletedRecords : DEFAULT_ACTIVITY_AUDIT_SETTINGS.showDeletedRecords,
      allowDestructiveDelete: parsed.allowDestructiveDelete !== undefined ? !!parsed.allowDestructiveDelete : DEFAULT_ACTIVITY_AUDIT_SETTINGS.allowDestructiveDelete
    };
  } catch (error) {
    console.error("Error reading activity & audit settings:", error);
    return DEFAULT_ACTIVITY_AUDIT_SETTINGS;
  }
}
