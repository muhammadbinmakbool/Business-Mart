"use client";

import React from "react";
import { updateIntakeStatusAction } from "@/modules/intake/controllers/intakeActions";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatusUpdateButtons({ intakeId, currentStatus }) {
  async function handleUpdate(status) {
    const result = await updateIntakeStatusAction(intakeId, status);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`Status updated to ${status}`);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => handleUpdate("PENDING")}
        disabled={currentStatus === "PENDING"}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
          currentStatus === "PENDING" 
            ? "bg-amber-50 text-amber-600 border border-amber-200 cursor-default" 
            : "hover:bg-accent border border-transparent"
        )}
      >
        <Clock className="h-4 w-4" />
        Mark as Pending
      </button>

      <button
        onClick={() => handleUpdate("COMPLETED")}
        disabled={currentStatus === "COMPLETED"}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
          currentStatus === "COMPLETED" 
            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default" 
            : "hover:bg-accent border border-transparent"
        )}
      >
        <CheckCircle className="h-4 w-4" />
        Mark as Completed
      </button>

      <button
        onClick={() => handleUpdate("CANCELLED")}
        disabled={currentStatus === "CANCELLED"}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
          currentStatus === "CANCELLED" 
            ? "bg-rose-50 text-rose-600 border border-rose-200 cursor-default" 
            : "hover:bg-accent border border-transparent"
        )}
      >
        <XCircle className="h-4 w-4" />
        Mark as Cancelled
      </button>
    </div>
  );
}
