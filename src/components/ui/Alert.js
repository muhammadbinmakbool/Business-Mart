"use client";

import React from "react";
import { Info, AlertTriangle, AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CLASSES = {
  info: "bg-blue-50/80 border-blue-200/60 text-blue-900 dark:bg-blue-950/15 dark:border-blue-950/30 dark:text-blue-300",
  warning: "bg-amber-50/80 border-amber-200/60 text-amber-900 dark:bg-amber-950/15 dark:border-amber-950/30 dark:text-amber-300",
  error: "bg-rose-50/80 border-rose-200/60 text-rose-900 dark:bg-rose-950/15 dark:border-rose-950/30 dark:text-rose-300",
  success: "bg-emerald-50/80 border-emerald-200/60 text-emerald-900 dark:bg-emerald-950/15 dark:border-emerald-950/30 dark:text-emerald-300",
};

const ICON_MAP = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
};

export default function Alert({
  type = "info",
  title,
  message,
  icon: CustomIcon,
  onClose,
  className,
  children
}) {
  const IconComponent = CustomIcon || ICON_MAP[type] || Info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 border rounded-xl p-4 text-sm animate-in fade-in duration-200",
        TYPE_CLASSES[type],
        className
      )}
    >
      <div className="shrink-0 mt-0.5">
        <IconComponent className={cn(
          "h-5 w-5",
          type === "info" && "text-blue-600 dark:text-blue-400",
          type === "warning" && "text-amber-600 dark:text-amber-400",
          type === "error" && "text-rose-600 dark:text-rose-400",
          type === "success" && "text-emerald-600 dark:text-emerald-400"
        )} />
      </div>

      <div className="flex-1 space-y-1 text-left">
        {title && <h5 className="font-bold tracking-tight">{title}</h5>}
        {message && <div className="leading-relaxed opacity-90">{message}</div>}
        {children && <div className="mt-2">{children}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-70 hover:opacity-100"
          aria-label="Close alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
