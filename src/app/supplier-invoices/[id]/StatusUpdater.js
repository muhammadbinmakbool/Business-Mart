"use client";

import React, { useState } from "react";
import { updateInvoiceStatusAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatusUpdater({ id, currentStatus, disabled }) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus) => {
    if (disabled || currentStatus === newStatus) return;
    
    setLoading(true);
    const result = await updateInvoiceStatusAction(id, newStatus);
    if (result.success) {
      toast.success(`Status updated to ${newStatus}`);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const statuses = ["PENDING", "COMPLETED"];

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Update Status</div>
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
        {statuses.map(s => (
          <button
            key={s}
            disabled={disabled || loading}
            onClick={() => handleStatusChange(s)}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              currentStatus === s 
                ? "bg-white shadow-sm text-primary" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {loading && currentStatus !== s ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : s}
          </button>
        ))}
      </div>
    </div>
  );
}
