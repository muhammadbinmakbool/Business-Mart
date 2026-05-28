"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, MoreVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatusUpdateButtons({ id, currentStatus, updateAction }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function handleUpdate(status) {
    if (status === currentStatus) return;
    
    setIsUpdating(true);
    setIsOpen(false);
    try {
      const result = await updateAction(id, status);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Status updated to ${status}`);
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  const statuses = [
    { label: "Pending", value: "PENDING", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Cleared", value: "CLEARED", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Cancelled", value: "CANCELLED", icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
      >
        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
        Change Status
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-card border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-1">
              {statuses.map((status) => {
                const Icon = status.icon;
                const isActive = currentStatus === status.value;
                return (
                  <button
                    key={status.value}
                    onClick={() => handleUpdate(status.value)}
                    disabled={isActive}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase transition-all",
                      isActive 
                        ? `${status.bg} ${status.color} ${status.border} border`
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? status.color : "opacity-40")} />
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
