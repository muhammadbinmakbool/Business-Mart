"use client";

import React, { useState } from "react";
import { regenerateSupplierInvoiceAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import { toast } from "sonner";
import { RefreshCcw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RegenerateButton({ invoiceId }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegenerate = async () => {
    if (!confirm("This will create a NEW version of this settlement based on current intake data. Proceed?")) return;
    
    setLoading(true);
    const result = await regenerateSupplierInvoiceAction(invoiceId);
    if (result.success) {
      toast.success("New version generated successfully!");
      router.push(`/supplier-invoices/${result.data.id}`);
    } else {
      toast.error(result.error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRegenerate}
      disabled={loading}
      className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
      Regenerate Settlement
    </button>
  );
}
