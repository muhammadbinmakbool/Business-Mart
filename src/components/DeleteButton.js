"use client";

import React, { useState } from "react";
import { Trash2, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DeleteButton({ 
  id, 
  deleteAction, 
  redirectPath, 
  label = "Item", 
  buttonText,
  variant = "default",
  className
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteAction(id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`${label} deleted successfully`);
        if (redirectPath) {
          router.push(redirectPath);
        } else {
          // If no redirect, we might need a refresh to update the list
          router.refresh();
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    if (variant === "icon") {
      return (
        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            title="Confirm Delete"
            className="p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            title="Cancel"
            className="p-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
        <span className="text-xs text-muted-foreground font-medium">Confirm?</span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-destructive/90 transition-colors flex items-center gap-1"
        >
          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Yes
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-secondary/90 transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowConfirm(true);
        }}
        className={cn(
          "rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
          className
        )}
        title={`Delete ${label}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={cn(
        "flex items-center gap-2 border border-destructive/20 text-destructive px-4 py-2 rounded-lg text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-all group",
        className
      )}
    >
      <Trash2 className="h-4 w-4 text-destructive group-hover:text-destructive-foreground" />
      {buttonText || label}
    </button>
  );
}
