export const dynamic = "force-dynamic";

import React from "react";
import { ProductService } from "@/modules/products/services/ProductService";
import ProductListClient from "./ProductListClient";

export default async function ProductsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  const page = parseInt(resolvedSearchParams.page) || 1;
  const limit = parseInt(resolvedSearchParams.limit) || 50;
  const search = resolvedSearchParams.search || "";
  const sortField = resolvedSearchParams.sortField || "name";
  const sortDirection = resolvedSearchParams.sortDirection || "asc";

  const { items: products, totalCount } = await ProductService.listProductsPaginated({
    page,
    limit,
    searchQuery: search,
    sortField,
    sortDirection
  });

  return (
    <ProductListClient
      products={products}
      totalCount={totalCount}
      currentPage={page}
      currentLimit={limit}
      currentSearch={search}
      currentSortField={sortField}
      currentSortDirection={sortDirection}
    />
  );
}

