"use client";

import React from "react";
import { toast } from "sonner";
import { Info, AlertTriangle, AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CONFIGS = {
  info: {
    bg: "bg-blue-50/95 dark:bg-blue-950/95 border-blue-200/80 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 shadow-blue-500/5",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100/70 dark:bg-blue-900/40",
    icon: Info
  },
  warning: {
    bg: "bg-amber-50/95 dark:bg-amber-950/95 border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 shadow-amber-500/5",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100/70 dark:bg-amber-900/40",
    icon: AlertTriangle
  },
  error: {
    bg: "bg-rose-50/95 dark:bg-rose-950/95 border-rose-200/80 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 shadow-rose-500/5",
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100/70 dark:bg-rose-900/40",
    icon: AlertCircle
  },
  success: {
    bg: "bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 shadow-emerald-500/5",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100/70 dark:bg-emerald-900/40",
    icon: CheckCircle
  }
};

export function Toast({
  id,
  type = "info",
  title,
  message,
  visible
}) {
  const config = TYPE_CONFIGS[type] || TYPE_CONFIGS.info;
  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3.5 border rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-sm w-full pointer-events-auto transition-all duration-300 transform border-muted-foreground/10",
        visible ? "animate-in slide-in-from-top duration-300" : "animate-out fade-out duration-150",
        config.bg
      )}
    >
      <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", config.iconBg, config.iconColor)}>
        <IconComponent className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-0.5 text-left">
        {title && <h5 className="font-bold text-sm tracking-tight leading-snug">{title}</h5>}
        {message && <div className="text-xs leading-normal opacity-90">{message}</div>}
      </div>

      <button
        onClick={() => toast.dismiss(id)}
        className="shrink-0 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors opacity-60 hover:opacity-100 mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Centralized high-order showToast utility
export const showToast = {
  success: (message, title = "Success") => {
    toast.custom((t) => (
      <Toast id={t} type="success" title={title} message={message} visible={t.visible} />
    ), { duration: 3500 });
  },
  error: (message, title = "Error") => {
    toast.custom((t) => (
      <Toast id={t} type="error" title={title} message={message} visible={t.visible} />
    ), { duration: 4000 });
  },
  warning: (message, title = "Warning") => {
    toast.custom((t) => (
      <Toast id={t} type="warning" title={title} message={message} visible={t.visible} />
    ), { duration: 3500 });
  },
  info: (message, title = "Information") => {
    toast.custom((t) => (
      <Toast id={t} type="info" title={title} message={message} visible={t.visible} />
    ), { duration: 3000 });
  }
};
