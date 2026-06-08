export const dynamic = "force-dynamic";

import React from "react";
import { ProductService } from "@/modules/products/services/ProductService";
import ProductListClient from "./ProductListClient";

export default async function ProductsPage() {
  const products = await ProductService.listProductsWithStock();

  return <ProductListClient products={products} />;
}
