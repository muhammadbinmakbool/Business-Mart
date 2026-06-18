export const dynamic = "force-dynamic";

import React from "react";
import { UnitService } from "@/modules/products/services/UnitService";
import CategoryListClient from "./CategoryListClient";

export default async function UnitCategoriesPage() {
  const categories = await UnitService.listCategories();
  
  // Serialize for safe boundary crossing
  const serializedCategories = JSON.parse(JSON.stringify(categories));

  return (
    <CategoryListClient initialCategories={serializedCategories} />
  );
}
