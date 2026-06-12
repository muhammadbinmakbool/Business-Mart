"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Keyboard, Sparkles } from "lucide-react";
import { getGeneralSettingsAction } from "@/modules/settings/controllers/settingsActions";

export default function FastEntryHelperCard() {
  const pathname = usePathname() || "";
  const [enabled, setEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);

  // 1. Fetch settings to see if helper is enabled globally
  useEffect(() => {
    async function checkSettings() {
      try {
        const res = await getGeneralSettingsAction();
        if (res.success && res.settings?.showFastEntryHelper !== false) {
          setEnabled(true);
        } else {
          setEnabled(false);
        }
      } catch (err) {
        console.error("Failed to load helper settings", err);
      }
    }
    checkSettings();
  }, []); // Only fetch settings once on initial mount

  // 2. Setup periodic wiggle animation for minimized bubble
  useEffect(() => {
    if (!enabled || isOpen) return;

    const interval = setInterval(() => {
      setIsWiggling(true);
      const timer = setTimeout(() => setIsWiggling(false), 600);
      return () => clearTimeout(timer);
    }, 12000); // wiggle every 12 seconds

    return () => clearInterval(interval);
  }, [enabled, isOpen]);

  if (!enabled) return null;

  // Determine current context based on path
  let pageType = "global";
  if (pathname.includes("/intake/create")) {
    pageType = "intake";
  } else if (pathname.includes("/sales/create")) {
    pageType = "sales";
  } else if (pathname.includes("/parties/create") || /\/parties\/[^/]+\/edit/.test(pathname)) {
    pageType = "party";
  }

  const getSteps = () => {
    const common = [
      { key: "Ctrl + K", desc: "Global Search & Command Palette" }
    ];

    switch (pageType) {
      case "intake":
        return [
          ...common,
          { key: "Enter", desc: "Move to Next Field" },
          { key: "Shift + Enter", desc: "Move to Previous Field" },
          { key: "Ctrl + Enter", desc: "Complete / Save Intake" },
          { key: "Escape", desc: "Cancel / Exit" },
          { key: "Sparkle", desc: "Click 'Apply' under empty fields for smart autofill" }
        ];
      case "sales":
        return [
          ...common,
          { key: "Enter", desc: "Move to Next Field" },
          { key: "Shift + Enter", desc: "Move to Previous Field" },
          { key: "Ctrl + Enter", desc: "Complete / Save Invoice" },
          { key: "Escape", desc: "Cancel / Exit" },
          { key: "Enter on Rate", desc: "Automatically appends a new item row!" },
          { key: "Sparkle", desc: "Click 'Apply' under empty fields for smart autofill" }
        ];
      case "party":
        return [
          ...common,
          { key: "Enter", desc: "Move to Next Field (Name → Phone → Type → Address → Notes)" },
          { key: "Shift + Enter", desc: "Move to Previous Field" },
          { key: "Ctrl + Enter", desc: "Save Party" },
          { key: "Escape", desc: "Cancel / Exit" }
        ];
      default:
        return common;
    }
  };

  const steps = getSteps();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes helperWiggle {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.1) rotate(-8deg); }
          30% { transform: scale(1.1) rotate(8deg); }
          45% { transform: scale(1.1) rotate(-4deg); }
          60% { transform: scale(1.1) rotate(4deg); }
          75% { transform: scale(1.1) rotate(-2deg); }
          90% { transform: scale(1.1) rotate(2deg); }
        }
        .animate-helper-wiggle {
          animation: helperWiggle 0.6s ease-in-out;
        }
      `}} />

      {isOpen ? (
        /* Expanded Helper Card */
        <div className="fixed bottom-4 right-4 z-50 max-w-xs sm:max-w-sm rounded-xl border border-primary/20 bg-card/95 backdrop-blur-md p-4 shadow-xl animate-in slide-in-from-bottom-5 duration-300 select-none">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <Keyboard className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-card-foreground">Keyboard Entry Guide</h4>
                <p className="text-[10px] text-muted-foreground">
                  {pageType !== "global" ? "Fast Entry active" : "Global shortcuts active"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Close guide"
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
      ) : (
        /* Minimized Helper Bubble/Button */
        <button
          onClick={() => setIsOpen(true)}
          type="button"
          className={`fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${
            isWiggling ? "animate-helper-wiggle" : ""
          }`}
          title="Open keyboard shortcut guide"
        >
          <Keyboard className="h-5 w-5" />
          <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-white border border-background animate-pulse">
            K
          </div>
        </button>
      )}
    </>
  );
}
