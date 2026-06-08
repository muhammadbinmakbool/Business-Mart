"use client";

import { useRef, useEffect, useCallback } from "react";
import { KeyboardFlowManager } from "@/lib/keyboardFlowManager";

/**
 * useKeyboardFlow
 *
 * React hook that bridges KeyboardFlowManager into any form component.
 *
 * Usage:
 * ```jsx
 * const { registerField } = useKeyboardFlow({
 *   fields: [
 *     { name: "partyId",   next: "productId", prev: null },
 *     { name: "productId", next: "weight",    prev: "partyId" },
 *     { name: "weight",    next: "rate",      prev: "productId" },
 *     { name: "rate",      next: null,        prev: "weight" },
 *   ],
 *   onSubmit: () => handleSubmit(),
 *   onCancel: () => {},
 * });
 *
 * // Then on each input:
 * <input ref={registerField("weight")} value={...} onChange={...} />
 * <select ref={registerField("partyId")} ... />
 * ```
 *
 * The hook internally attaches keydown listeners via the ref callback,
 * so no extra onKeyDown prop is needed on the element.
 *
 * @param {Object} options
 * @param {Array<{name: string, next: string|null, prev: string|null}>} options.fields
 * @param {Function} [options.onSubmit]
 * @param {Function} [options.onCancel]
 * @returns {{ registerField: (name: string) => (el: HTMLElement|null) => void }}
 */
export function useKeyboardFlow({ fields, onSubmit, onCancel }) {
  // Stable ref to the manager instance — survives re-renders.
  const managerRef = useRef(null);

  // Stable ref for the latest onSubmit/onCancel so the manager
  // always calls the current closure, not a stale one.
  const callbacksRef = useRef({ onSubmit, onCancel });
  callbacksRef.current = { onSubmit, onCancel };

  // Map of fieldName → { element, keydownHandler } for cleanup
  const attachmentsRef = useRef(new Map());

  // Create manager once
  if (!managerRef.current) {
    managerRef.current = new KeyboardFlowManager({
      onSubmit: () => callbacksRef.current.onSubmit?.(),
      onCancel: () => callbacksRef.current.onCancel?.(),
    });
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove all keydown listeners
      for (const [, attachment] of attachmentsRef.current) {
        if (attachment.element && attachment.handler) {
          attachment.element.removeEventListener("keydown", attachment.handler);
        }
      }
      attachmentsRef.current.clear();

      // Destroy manager
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, []);

  /**
   * Returns a ref callback for a given field name.
   * When React attaches the ref (element mount), we:
   *   1. Register the field in the manager with its next/prev pointers
   *   2. Attach a keydown listener that delegates to the manager
   * When React detaches (element unmount / null), we clean up.
   */
  const registerField = useCallback(
    (name) => {
      // Find this field's navigation config
      const fieldConfig = fields.find((f) => f.name === name);

      return (el) => {
        const manager = managerRef.current;
        if (!manager) return;

        // ── Cleanup previous attachment for this name (if any) ──
        const prev = attachmentsRef.current.get(name);
        if (prev && prev.element && prev.handler) {
          prev.element.removeEventListener("keydown", prev.handler);
        }

        if (el) {
          // ── Mount: register + attach listener ──
          manager.registerField(name, el, {
            next: fieldConfig?.next ?? null,
            prev: fieldConfig?.prev ?? null,
          });

          const handler = (event) => {
            manager.handleKeyDown(event, name);
          };

          el.addEventListener("keydown", handler);
          attachmentsRef.current.set(name, { element: el, handler });
        } else {
          // ── Unmount: unregister + clean map entry ──
          manager.unregisterField(name);
          attachmentsRef.current.delete(name);
        }
      };
    },
    // fields array identity drives reconfiguration
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields]
  );

  return { registerField };
}
