"use client";

import React, { useEffect, useRef } from "react";
import { Info, AlertTriangle, AlertCircle, CheckCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CONFIGS = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/10",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconText: "text-blue-700 dark:text-blue-500",
    border: "border-blue-200 dark:border-blue-900/40",
    icon: Info,
    confirmBtn: "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500/20"
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/10",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconText: "text-amber-700 dark:text-amber-500",
    border: "border-amber-200 dark:border-amber-900/40",
    icon: AlertTriangle,
    confirmBtn: "bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500/20"
  },
  error: {
    bg: "bg-rose-50 dark:bg-rose-950/10",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconText: "text-rose-700 dark:text-rose-500",
    border: "border-rose-200 dark:border-rose-900/40",
    icon: AlertCircle,
    confirmBtn: "bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500/20"
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/10",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconText: "text-emerald-700 dark:text-emerald-500",
    border: "border-emerald-200 dark:border-emerald-900/40",
    icon: CheckCircle,
    confirmBtn: "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500/20"
  },
  danger: {
    bg: "bg-rose-50 dark:bg-rose-950/10",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconText: "text-rose-700 dark:text-rose-500",
    border: "border-rose-200 dark:border-rose-900/40",
    icon: Trash2,
    confirmBtn: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive/20"
  }
};

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[95vw] h-[95vh]"
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  type = "info",
  size = "md",
  confirmLabel,
  onConfirm,
  cancelLabel = "Cancel",
  onCancel,
  loading = false,
  preventCloseOnBackdrop = false,
  children,
  footer
}) {
  const modalRef = useRef(null);

  // Esc key close handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !preventCloseOnBackdrop && !loading) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, preventCloseOnBackdrop, loading]);

  // Focus trap / body scroll locking
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const config = TYPE_CONFIGS[type] || TYPE_CONFIGS.info;
  const IconComponent = config.icon;

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target) && !preventCloseOnBackdrop && !loading) {
      onClose?.();
    }
  };

  const handleCancelAction = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose?.();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className={cn(
          "w-full bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200",
          SIZE_CLASSES[size],
          size === "full" ? "max-h-[95vh]" : "max-h-[90vh]"
        )}
      >
        {/* Header Block */}
        <div className={cn("flex items-center justify-between border-b px-6 py-4", config.bg)}>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg shrink-0", config.iconBg, config.iconText)}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-base text-foreground leading-snug">{title}</h3>
              {description && <p className="text-xs opacity-75 mt-0.5 leading-normal">{description}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-left space-y-4">
          {children}
        </div>

        {/* Footer actions */}
        {footer !== undefined ? (
          footer
        ) : (
          <div className="border-t px-6 py-4 bg-muted/20 flex justify-end gap-3 font-medium shrink-0">
            {cancelLabel && (
              <button
                type="button"
                onClick={handleCancelAction}
                disabled={loading}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            )}
            {confirmLabel && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 disabled:opacity-50",
                  config.confirmBtn
                )}
              >
                {loading ? "Processing..." : confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
