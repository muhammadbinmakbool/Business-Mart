"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "./AuthContext";
import { DestructiveModeBanner } from "./DestructiveModeModal";

export function AppLayout({ children, salesWorkflow, isSourceTrackingEnabled }) {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse, isMobileOpen, setIsMobileOpen } = useSidebar();
  const { isDestructiveActive } = useAuth();

  const isLoginPage = pathname === "/login";

  const handleDestructiveModeExited = () => {
    setIsDestructiveActive(false);
    window.location.reload();
  };

  if (isLoginPage) {
    return (
      <div className="min-h-screen w-screen bg-background flex flex-col justify-center">
        {children}
      </div>
    );
  }

  const isPosPage = pathname === "/sales/pos" || (pathname === "/sales/create" && salesWorkflow === "POS");

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Destructive Mode Warning Banner - Spans the full width of the screen */}
      {isDestructiveActive && (
        <DestructiveModeBanner onExit={handleDestructiveModeExited} />
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop Sidebar (hidden on mobile) */}
        {(() => {
          const effectiveCollapsed = isCollapsed || isPosPage;
          return (
            <div 
              className="relative hidden md:block h-full transition-all duration-300 ease-in-out shrink-0 border-r"
              style={{ width: effectiveCollapsed ? "80px" : "256px" }}
            >
              <Sidebar forceCollapsed={isPosPage} isSourceTrackingEnabled={isSourceTrackingEnabled} />

              {/* Collapse / Expand toggle — lives here so it's never clipped by Sidebar's overflow-hidden */}
              {!isPosPage && (
                <button
                  onClick={toggleCollapse}
                  className="absolute -right-3 top-20 z-40 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-200 hover:scale-110"
                  title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronLeft className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          );
        })()}

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
              <Sidebar forceExpanded onClose={() => setIsMobileOpen(false)} isSourceTrackingEnabled={isSourceTrackingEnabled} />
            </div>
          </div>
        )}

        {/* Main Content Area - Transitions automatically in sync with the Sidebar */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0 transition-all duration-300 ease-in-out">
          <Topbar />
          <main className={`flex-1 p-6 bg-background ${isPosPage ? "overflow-hidden flex flex-col h-full" : "overflow-y-auto"}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
