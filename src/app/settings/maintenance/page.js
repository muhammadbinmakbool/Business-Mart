import React from "react";
import { getSession } from "@/lib/session";
import { canAccessSettings } from "@/lib/permissions";
import { redirect } from "next/navigation";
import MaintenanceDashboard from "./MaintenanceDashboard";

export default async function MaintenancePage() {
  const session = await getSession();
  if (!session || !canAccessSettings(session.role)) {
    redirect("/dashboard");
  }

  return <MaintenanceDashboard />;
}
