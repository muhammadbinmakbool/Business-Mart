/**
 * KeyboardFlowManager
 * 
 * Central keyboard navigation engine for form field traversal.
 * Pure JavaScript — no React, no Next.js dependencies.
 * 
 * Fields are registered as a linked list via { next, prev } pointers.
 * Key routing:
 *   Enter        → focus next field
 *   Shift+Enter  → focus previous field
 *   Ctrl+Enter   → trigger onSubmit callback
 *   Escape       → blur active element / trigger onCancel callback
 * 
 * @see docs/developer/fast-entry-system/keyboard-flow-guide.md
 */

export class KeyboardFlowManager {
  /**
   * @param {Object} options
   * @param {Function} [options.onSubmit]  — called on Ctrl+Enter
   * @param {Function} [options.onCancel]  — called on Escape (optional)
   */
  constructor(options = {}) {
    this._fields = new Map();   // name → { ref, next, prev }
    this._onSubmit = options.onSubmit || null;
    this._onCancel = options.onCancel || null;
  }

  // ── Field Registry ──────────────────────────────────────────────

  /**
   * Register a field in the navigation graph.
   *
   * @param {string} name        — unique field identifier
   * @param {HTMLElement} ref    — the actual DOM element (input, select, textarea)
   * @param {Object}  [opts]
   * @param {string|null} [opts.next]  — name of the next field (null = last field)
   * @param {string|null} [opts.prev]  — name of the previous field (null = first field)
   */
  registerField(name, ref, opts = {}) {
    this._fields.set(name, {
      ref,
      next: opts.next ?? null,
      prev: opts.prev ?? null,
    });
  }

  /**
   * Remove a field from the registry and null its ref.
   * @param {string} name
   */
  unregisterField(name) {
    this._fields.delete(name);
  }

  // ── Navigation Queries ──────────────────────────────────────────

  /**
   * @param {string} currentName
   * @returns {string|null} name of the next field, or null
   */
  getNextField(currentName) {
    const entry = this._fields.get(currentName);
    return entry ? entry.next : null;
  }

  /**
   * @param {string} currentName
   * @returns {string|null} name of the previous field, or null
   */
  getPreviousField(currentName) {
    const entry = this._fields.get(currentName);
    return entry ? entry.prev : null;
  }

  // ── Focus Management ────────────────────────────────────────────

  /**
   * Safely focus a registered field by name.
   * For number inputs, auto-selects the value for quick overtyping.
   *
   * @param {string} name
   * @returns {boolean} true if focus succeeded
   */
  focusField(name) {
    const entry = this._fields.get(name);
    if (!entry || !entry.ref) return false;

    const el = entry.ref;

    try {
      el.focus();

      // Auto-select number/text inputs for quick overtyping
      if (
        el.tagName === "INPUT" &&
        (el.type === "number" || el.type === "text") &&
        typeof el.select === "function"
      ) {
        el.select();
      }
    } catch (_) {
      // Silently ignore focus failures (e.g. disabled/hidden elements)
      return false;
    }

    return true;
  }

  // ── Key Routing ─────────────────────────────────────────────────

  /**
   * Core key event router. Call this from the onKeyDown handler of each field.
   *
   * @param {KeyboardEvent} event
   * @param {string} currentFieldName — the name of the field that received the event
   */
  handleKeyDown(event, currentFieldName) {
    const key = event.key;

    // ── Ctrl + Enter → Submit ──
    if (key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (this._onSubmit) {
        this._onSubmit();
      }
      return;
    }

    // ── Escape → Blur / Cancel ──
    if (key === "Escape") {
      event.preventDefault();
      if (document.activeElement) {
        document.activeElement.blur();
      }
      if (this._onCancel) {
        this._onCancel();
      }
      return;
    }

    // ── Enter / Shift+Enter → Navigate ──
    if (key === "Enter") {
      event.preventDefault();

      if (event.shiftKey) {
        // Shift + Enter → previous field
        const prev = this.getPreviousField(currentFieldName);
        if (prev) {
          this.focusField(prev);
        }
      } else {
        // Enter → next field
        const next = this.getNextField(currentFieldName);
        if (next) {
          this.focusField(next);
        }
      }
      return;
    }

    // All other keys — do nothing, let browser handle natively.
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  /**
   * Tear down the manager: clear all field refs and callbacks.
   */
  destroy() {
    this._fields.clear();
    this._onSubmit = null;
    this._onCancel = null;
  }
}
