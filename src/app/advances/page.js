export const dynamic = "force-dynamic";

import React from "react";
import { AdvanceService } from "@/modules/intake/services/AdvanceService";
import AdvanceListClient from "./AdvanceListClient";

export default async function AdvancesPage() {
  const advances = await AdvanceService.listAdvances();

  return <AdvanceListClient advances={advances} />;
}
