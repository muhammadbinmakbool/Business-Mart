# Keyboard Flow System — Phase 4: Global Command Palette

This document covers the implementation of the global Command Palette system added during Phase 4 of the Fast Entry System.

---

## 1. Directory Structure

The module is housed completely in its own self-contained directory `src/modules/command-palette/`:
- `controllers/commandPaletteActions.js`: Server action to fetch cached datasets (Parties, Products, and last 50 Sales and Intakes).
- `registry/commandRegistry.js`: Static command list (Navigation routes, creation forms, keyword indexes).
- `utils/commandExecutor.js`: Decoupled helper executing routing actions (`router.push`) and callback actions.
- `components/CommandPalette.js`: The React overlay component itself.

---

## 2. In-Memory Search & Priority Scoring

To ensure instant interaction speed and avoid coupling database queries to keyboard triggers, search uses an in-memory weighted matching algorithm over a cached dataset.

### Weighted Priority scoring:
- **Exact Match (Score 3)**: Query matches Title or Keyword exactly.
- **startsWith Match (Score 2)**: Title or Keyword begins with query.
- **includes Match (Score 1)**: Title, Subtitle, or Keyword contains query.

Scored items are sorted by score descending, filtering out non-matching items (score 0), returning the top 20 matches.

---

## 3. Keyboard Interactions

The global event hook maps standard key interactions:
- `Ctrl + K`: Toggles palette overlay open/closed.
- `Escape`: Closes palette overlay.
- `ArrowUp` / `ArrowDown`: Moves selection highlight through filtered results.
- `Enter`: Selects the item and executes it via the `commandExecutor`.
- Focus is automatically reset and scrolled to keep the selection visible.
