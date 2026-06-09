import { useState, useEffect } from "react";
import { getSuggestions } from "../rules/suggestionRules";

/**
 * Custom React Hook to compute smart data-entry suggestions.
 * Debounces recalculations by 100ms for performance safety.
 */
export function useFastEntryAssistant({ context, partyId, productId, items = [], index = 0 }) {
  const [suggestions, setSuggestions] = useState({ party: null, product: null, unit: null, rate: null });

  useEffect(() => {
    const handler = setTimeout(() => {
      const computed = getSuggestions({ context, partyId, productId, items, index });
      setSuggestions(computed);
    }, 100);

    return () => clearTimeout(handler);
  }, [context, partyId, productId, items, index]);

  return suggestions;
}
