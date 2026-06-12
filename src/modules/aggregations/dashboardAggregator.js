import { DashboardService } from "@/modules/dashboard/services/dashboardService";
import { getCached, setCached } from "./cache";

/**
 * Domain Aggregator: Dashboard
 * Collects and caches all operational metrics for the Dashboard view.
 * Computations are delegated to DashboardService.
 */
export async function getDashboardSummary() {
  const cacheKey = "dashboard_summary";
  const cached = getCached("dashboard", cacheKey);
  if (cached) {
    return cached;
  }

  const data = await DashboardService.getOverviewData();
  const serialized = JSON.parse(JSON.stringify(data));
  
  // Cache for 30 seconds
  setCached("dashboard", cacheKey, serialized, 30 * 1000);
  
  return serialized;
}
