export const dynamic = "force-dynamic";

import React from "react";
import ActivityClient from "./ActivityClient";

export default async function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Activity Log</h1>
        <p className="text-muted-foreground">Comprehensive system-wide audit trail of operational and telemetry events.</p>
      </div>

      <ActivityClient />
    </div>
  );
}
