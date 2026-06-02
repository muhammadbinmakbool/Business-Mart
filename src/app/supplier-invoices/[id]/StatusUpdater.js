"use client";

import React, { useState } from "react";
import { updateInvoiceStatusAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import { toast } from "sonner";
import { CheckCircle, Clock, XCircle, MoreVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";

export default function StatusUpdater({ id, currentStatus, disabled, allowedActions = {} }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showCancelNotesModal, setShowCancelNotesModal] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");

  async function handleUpdate(status) {
    if (disabled || status === currentStatus) return;
    
    setIsOpen(false);
    if (status === "CANCELLED" && allowedActions.rules?.requiresCancellationNotes) {
      setShowCancelNotesModal(true);
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateInvoiceStatusAction(id, status);
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

  async function submitCancellation() {
    if (allowedActions.rules?.requiresCancellationNotes && (!cancelNotes || cancelNotes.trim().length === 0)) {
      toast.error("Cancellation notes are required");
      return;
    }
    setShowCancelNotesModal(false);
    setIsUpdating(true);
    try {
      const result = await updateInvoiceStatusAction(id, "CANCELLED", cancelNotes);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Status updated to CANCELLED");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
      setCancelNotes("");
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
        disabled={disabled || isUpdating}
        className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
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

      {/* Cancellation Notes Prompt Modal */}
      <Modal
        isOpen={showCancelNotesModal}
        onClose={() => {
          setShowCancelNotesModal(false);
          setCancelNotes("");
        }}
        title="Reason for Cancellation"
        description="Cancellation notes are required"
        type="warning"
        confirmLabel="Confirm Cancellation"
        onConfirm={submitCancellation}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Please provide a brief reason for cancelling this supplier invoice/settlement.
          </p>
          <textarea
            required
            rows={3}
            placeholder="Enter reason..."
            value={cancelNotes}
            onChange={(e) => setCancelNotes(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>
      </Modal>
    </div>
  );
}
