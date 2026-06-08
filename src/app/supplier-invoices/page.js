export const dynamic = "force-dynamic";

import React from "react";
import { listSupplierInvoicesAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import SupplierInvoiceListClient from "./SupplierInvoiceListClient";

export default async function SupplierInvoicesPage() {
  const result = await listSupplierInvoicesAction();
  const invoices = result.success ? result.data : [];

  return <SupplierInvoiceListClient invoices={invoices} />;
}
