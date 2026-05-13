"use client";

import React from "react";
import { updateSaleStatusAction } from "@/modules/sales/controllers/saleActions";
import { toast } from "sonner";

export default function RevertStatusButton({ id }) {
  return (
    <button
      onClick={async () => {
        const result = await updateSaleStatusAction(id, "PENDING");
        if (result.success) {
          toast.success("Invoice reverted to PENDING");
        } else {
          toast.error("Failed to revert status");
        }
      }}
      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
    >
      Revert to Pending
    </button>
  );
}
