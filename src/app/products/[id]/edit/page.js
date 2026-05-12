import React from "react";
import { ProductService } from "@/modules/products/services/ProductService";
import EditProductForm from "./EditProductForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditProductPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const product = await ProductService.getProduct(params.id);

  if (!product) {
    return <div className="p-8 text-center">Product not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-sm text-muted-foreground">Update item specifications and units.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <EditProductForm product={product} />
      </div>
    </div>
  );
}
