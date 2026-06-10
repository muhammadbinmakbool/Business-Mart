export const dynamic = "force-dynamic";

import React from "react";
import { DashboardService } from "@/modules/dashboard/services/dashboardService";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const overviewData = await DashboardService.getOverviewData();
  const serializedData = JSON.parse(JSON.stringify(overviewData));

  return (
    <DashboardClient 
      data={serializedData} 
    />
  );
}
