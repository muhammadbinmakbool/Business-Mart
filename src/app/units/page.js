export const dynamic = "force-dynamic";

import React from "react";
import { UnitService } from "@/modules/products/services/UnitService";
import UnitListClient from "./UnitListClient";

export default async function UnitsPage() {
  const units = await UnitService.listUnits();
  const categories = await UnitService.listCategories();
  
  // Serialize Decimals / Date fields for safety
  const serializedUnits = JSON.parse(JSON.stringify(units));
  const serializedCategories = JSON.parse(JSON.stringify(categories));

  return (
    <UnitListClient 
      initialUnits={serializedUnits} 
      categories={serializedCategories} 
    />
  );
}
