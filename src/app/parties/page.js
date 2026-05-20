export const dynamic = "force-dynamic";

import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import PartyListClient from "./PartyListClient";

export default async function PartiesPage() {
  const parties = await PartyService.listParties();

  return <PartyListClient parties={parties} />;
}
