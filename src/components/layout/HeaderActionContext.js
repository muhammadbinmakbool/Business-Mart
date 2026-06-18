"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * HeaderActionContext
 *
 * Allows page-level components to register a React element (e.g. an action button)
 * that gets rendered in the persistent tab bar row inside AppLayout.
 * This avoids the visual gap between the layout-level tabs and the page-level action buttons.
 */
const HeaderActionContext = createContext({
  headerAction: null,
  setHeaderAction: () => {},
});

export function HeaderActionProvider({ children }) {
  const [headerAction, setHeaderActionState] = useState(null);

  const setHeaderAction = useCallback((node) => {
    setHeaderActionState(node);
  }, []);

  return (
    <HeaderActionContext.Provider value={{ headerAction, setHeaderAction }}>
      {children}
    </HeaderActionContext.Provider>
  );
}

/**
 * Hook for page components to register their action button.
 * Returns { setHeaderAction } — call it with a ReactNode on mount
 * and with null on unmount.
 */
export function useHeaderAction() {
  return useContext(HeaderActionContext);
}
