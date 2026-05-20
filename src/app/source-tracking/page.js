export const dynamic = "force-dynamic";

import React from "react";
import { SalesTrackService } from "@/modules/sales/services/SalesTrackService";
import SourceTrackingListClient from "./SourceTrackingListClient";

export default async function SourceTrackingPage() {
  const tracks = await SalesTrackService.list();

  return <SourceTrackingListClient tracks={tracks} />;
}
