import React from "react";
import { getSession } from "@/lib/session";
import { canAccessSettings } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdjustmentsDashboard from "./AdjustmentsDashboard";

export default async function AdjustmentsSettingsPage() {
  const session = await getSession();
  if (!session || !canAccessSettings(session.role)) {
    redirect("/dashboard");
  }

  return <AdjustmentsDashboard userRole={session.role} />;
}
