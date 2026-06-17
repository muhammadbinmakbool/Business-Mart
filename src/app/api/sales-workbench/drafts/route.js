import { getFeatureFlags } from "@/lib/settings/featureFlags";
import { SalesDraftDataProvider } from "@/modules/sales-workbench/services/SalesDraftDataProvider";
import { SalesDraftService } from "@/modules/sales-workbench/services/SalesDraftService";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const flags = await getFeatureFlags();
    
    // If workbench suggestions are disabled, return empty draft list but still fetch active intakes
    const enableSuggestions = flags.enableWorkbenchSuggestions !== false;
    
    let drafts = [];
    let pendingIntakes = [];
    let recentSales = [];
    
    if (enableSuggestions) {
      const [draftsRes, activeIntakes] = await Promise.all([
        SalesDraftService.getAllSuggestedDrafts(),
        SalesDraftDataProvider.fetchActiveIntakes()
      ]);
      drafts = draftsRes;
      pendingIntakes = activeIntakes;
    } else {
      // Suggestions are disabled, but we still fetch raw pending intakes for flow B tracker
      pendingIntakes = await SalesDraftDataProvider.fetchActiveIntakes();
    }
    
    // Always fetch recent sales for the activity monitor
    recentSales = await SalesDraftDataProvider.fetchRecentFinalizedSales();

    return NextResponse.json({
      success: true,
      enabled: enableSuggestions,
      drafts,
      pendingIntakes,
      recentSales
    });
  } catch (error) {
    console.error("Error fetching workbench drafts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load workbench data" },
      { status: 500 }
    );
  }
}
