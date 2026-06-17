export const dynamic = "force-dynamic";

import React from "react";
import { ProductCategoryService } from "@/modules/products/services/ProductCategoryService";
import CategoryListClient from "./CategoryListClient";

export default async function ProductCategoriesPage() {
  const categories = await ProductCategoryService.listCategories();
  
  // Serialize Decimals / Date fields if any for safety
  const serializedCategories = JSON.parse(JSON.stringify(categories));

  return (
    <CategoryListClient initialCategories={serializedCategories} />
  );
}
