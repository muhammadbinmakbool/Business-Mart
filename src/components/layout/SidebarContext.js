"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Load initial desktop collapse state from localStorage on mount safely (SSR/Hydration safe)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-collapsed");
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch (e) {
      console.error("Error reading sidebar collapse state:", e);
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch (e) {
        console.error("Error saving sidebar collapse state:", e);
      }
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        toggleCollapse,
        isMobileOpen,
        setIsMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
