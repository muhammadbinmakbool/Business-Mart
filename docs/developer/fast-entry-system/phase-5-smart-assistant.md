# Keyboard Flow System — Phase 5: Smart Inline Assistant Layer

This document covers the implementation of the Smart Inline Assistant Layer added during Phase 5 of the Fast Entry System.

---

## 1. Architecture Overview

The Smart Inline Assistant Layer is built completely client-side to minimize latency and avoid interrupting operator workflows. It sits on top of the Phase 3 memory store to automatically calculate next-field recommendations.

All files are isolated in the `src/modules/fast-entry-assistant/` folder:
- `rules/suggestionRules.js`: Contains pure, stateless logic to resolve the current best recommendation values.
- `hooks/useFastEntryAssistant.js`: React state wrapper that debounces calculations to prevent key lag.
- `components/InlineSuggestionBox.js`: Standardized rendering element that handles micro-interactions.

---

## 2. Suggestion Priority Hierarchy

To guarantee predictable assistance without confusing operators, suggestions strictly adhere to the following priority:

1. **Active input value**: If a field contains characters or is currently selected/filled, any suggestion helper is immediately dismissed.
2. **Current form context**:
   - For Sales line-items, suggestions at row index `i` default to the values input in row `i - 1` (Product, Unit, Rate).
3. **Phase 3 Memory Store**:
   - If no contextual inline values exist (e.g., Supplier/Buyer selector, or the first line item in Sales), recommendations fallback to the global `fastEntryMemoryStore` values.

---

## 3. Keyboard Flow Non-Interference

The assistant acts purely as passive "help text" and never automatically forces or commits choices:
- Suggestions are not auto-focused or auto-applied by Tab or Enter keypresses unless the operator explicitly selects **Apply**.
- Visual suggestion elements dynamically mount and unmount in a non-blocking container to avoid shifting core layout grids.
