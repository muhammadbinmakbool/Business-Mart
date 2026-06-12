"use server";

import { ActivityLogService } from "@/modules/activity-log/services/ActivityLogService";

/**
 * Server action to fetch paginated and filtered activity logs from the database.
 */
export async function fetchActivityLogsAction({
  entityType,
  action,
  entityId,
  startDate,
  endDate,
  page = 1,
  limit = 20
}) {
  try {
    const { clampLimit } = await import("@/lib/pagination");
    const clampedLimit = clampLimit(limit);
    const skip = (page - 1) * clampedLimit;
    const { logs, total } = await ActivityLogService.getLogs({
      entityType: entityType || undefined,
      action: action || undefined,
      entityId: entityId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      skip,
      take: clampedLimit
    });

    return {
      success: true,
      logs: JSON.parse(JSON.stringify(logs)),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  } catch (error) {
    console.error("Failed to fetch activity logs action:", error);
    return { success: false, error: error.message };
  }
}
