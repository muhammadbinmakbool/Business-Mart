"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useSidebar } from "./SidebarContext";

export function AppLayout({ children }) {
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div 
        className="hidden md:block h-full transition-all duration-300 ease-in-out shrink-0 border-r"
        style={{ width: isCollapsed ? "80px" : "256px" }}
      >
        <Sidebar />
      </div>

      {/* Mobile Slide-over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop with fade-in blur */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer Sidebar with slide-in animation */}
          <div className="relative z-10 flex h-full w-64 flex-col bg-card shadow-2xl animate-in slide-in-from-left duration-300 ease-in-out border-r">
            <Sidebar forceExpanded onClose={() => setIsMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area - Transitions automatically in sync with the Sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 transition-all duration-300 ease-in-out">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
