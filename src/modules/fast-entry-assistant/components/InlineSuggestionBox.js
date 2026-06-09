import React from "react";
import { Sparkles } from "lucide-react";

/**
 * Standardized inline suggestion component.
 * Displays smart autofill suggestions under inputs.
 * 
 * Props:
 * - suggestion: the suggested value (shows nothing if falsy)
 * - label: human-readable display label for the suggestion
 * - onApply: callback when the user clicks Apply
 * - currentValue: the field's current value — suggestion is hidden when this is truthy
 */
export default function InlineSuggestionBox({ suggestion, label, onApply, currentValue }) {
  if (!suggestion) return null;
  if (currentValue) return null;

  return (
    <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200 select-none">
      <Sparkles className="h-3 w-3 text-primary animate-pulse shrink-0" />
      <span>Suggested: <strong className="font-semibold text-foreground">{label || suggestion}</strong></span>
      <button
        type="button"
        onClick={onApply}
        className="ml-1.5 text-primary hover:text-primary-hover font-bold hover:underline cursor-pointer border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 px-1.5 py-0.5 rounded transition-all text-[10px] uppercase tracking-wider"
      >
        Apply
      </button>
    </div>
  );
}
