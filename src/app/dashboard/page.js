export const dynamic = "force-dynamic";

import React from "react";
import { getDashboardSummary } from "@/modules/aggregations/dashboardAggregator";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const serializedData = await getDashboardSummary();

  return (
    <DashboardClient 
      data={serializedData} 
    />
  );
}
