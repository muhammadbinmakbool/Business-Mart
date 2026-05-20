export const dynamic = "force-dynamic";

import React from "react";
import { SaleService } from "@/modules/sales/services/SaleService";
import SalesListClient from "./SalesListClient";

export default async function SalesPage() {
  const sales = await SaleService.listSales();

  return <SalesListClient sales={sales} />;
}
