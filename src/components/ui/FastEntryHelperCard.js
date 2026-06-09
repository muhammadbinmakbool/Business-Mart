"use client";

import React, { useState, useEffect } from "react";
import { X, Keyboard, Sparkles } from "lucide-react";
import { getGeneralSettingsAction } from "@/modules/settings/controllers/settingsActions";

export default function FastEntryHelperCard({ type }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    async function checkVisibility() {
      // 1. Check if user dismissed it in this browser session/localstorage
      const dismissed = localStorage.getItem(`fast_entry_helper_dismissed_${type}`);
      if (dismissed === "true") {
        return;
      }

      // 2. Fetch DB setting
      try {
        const res = await getGeneralSettingsAction();
        if (res.success && res.settings?.showFastEntryHelper !== false) {
          setShow(true);
        }
      } catch (err) {
        console.error("Failed to load helper visibility setting", err);
      }
    }

    checkVisibility();
  }, [type]);

  if (!show) return null;

  const handleDismiss = () => {
    localStorage.setItem(`fast_entry_helper_dismissed_${type}`, "true");
    setShow(false);
  };

  const getSteps = () => {
    switch (type) {
      case "intake":
        return [
          { key: "Enter", desc: "Move to Next Field" },
          { key: "Shift + Enter", desc: "Move to Previous Field" },
          { key: "Ctrl + Enter", desc: "Save Intake" },
          { key: "Escape", desc: "Cancel / Exit" },
          { key: "Sparkle", desc: "Click 'Apply' under empty fields for smart autofill" }
        ];
      case "sales":
        return [
          { key: "Enter", desc: "Move to Next Field" },
          { key: "Shift + Enter", desc: "Move to Previous Field" },
          { key: "Ctrl + Enter", desc: "Save Invoice" },
          { key: "Escape", desc: "Cancel / Exit" },
          { key: "Enter on Rate", desc: "Automatically appends a new item row!" },
          { key: "Sparkle", desc: "Click 'Apply' under empty fields for smart autofill" }
        ];
      case "party":
        return [
          { key: "Enter", desc: "Move to Next Field (Name → Phone → Type → Address → Notes)" },
          { key: "Shift + Enter", desc: "Move to Previous Field" },
          { key: "Ctrl + Enter", desc: "Save Party" },
          { key: "Escape", desc: "Cancel / Exit" }
        ];
      default:
        return [];
    }
  };

  const steps = getSteps();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs sm:max-w-sm rounded-xl border border-primary/20 bg-card/95 backdrop-blur-md p-4 shadow-xl animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Keyboard className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-card-foreground">Keyboard Entry Guide</h4>
            <p className="text-[10px] text-muted-foreground">Fast Entry System active</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          type="button"
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Dismiss guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ul className="space-y-1.5 text-[11px] text-muted-foreground border-t pt-2 mt-2">
        {steps.map((step, idx) => (
          <li key={idx} className="flex items-start gap-2">
            {step.key === "Sparkle" ? (
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <kbd className="inline-flex h-4 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground shrink-0 mt-0.5">
                {step.key}
              </kbd>
            )}
            <span className="leading-tight">{step.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
