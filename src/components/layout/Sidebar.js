"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart,
  Coins,
  ReceiptText,
  BookOpen, 
  TrendingUp, 
  Settings,
  History,
  Banknote,
  Route,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Parties", href: "/parties", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Goods Intake", href: "/intake", icon: ShoppingCart },
  { name: "Supplier Advances", href: "/advances", icon: Coins },
  { name: "Supplier Settlements", href: "/supplier-invoices", icon: Banknote },
  { name: "Sales / Billing", href: "/sales", icon: ReceiptText },
  { name: "Source Tracking", href: "/source-tracking", icon: Route },
  { name: "Ledger", href: "/ledger", icon: BookOpen },
  { name: "Market Insight", href: "/market-insight", icon: TrendingUp },
  { name: "Activity Log", href: "/activity", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ forceExpanded = false, onClose }) {
  const pathname = usePathname();
  const { isCollapsed: contextCollapsed } = useSidebar();

  // If forceExpanded is true (e.g. mobile drawer), ignore collapsed state
  const isCollapsed = forceExpanded ? false : contextCollapsed;

  // Fixed-position tooltip state — renders outside all overflow containers
  const [tooltip, setTooltip] = useState({ visible: false, text: "", top: 0 });

  const showTooltip = useCallback((e, text) => {
    if (!isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ visible: true, text, top: rect.top + rect.height / 2 });
  }, [isCollapsed]);

  const hideTooltip = useCallback(() => {
    setTooltip({ visible: false, text: "", top: 0 });
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-card text-card-foreground relative overflow-hidden">
      {/* Brand Header */}
      <div className={cn(
        "flex h-16 items-center border-b transition-all duration-300 shrink-0",
        isCollapsed ? "justify-center px-4" : "justify-between px-6"
      )}>
        <div className="flex items-center gap-3">
          {/* Recognizable brand Logo Icon (always visible) */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-md shadow-primary/20">
            <span className="font-bold text-sm tracking-tight">BM</span>
          </div>
          {/* Logo Text (hidden when collapsed) */}
          {!isCollapsed && (
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent animate-in fade-in duration-200">
              Business Mart
            </span>
          )}
        </div>

        {/* Close Button on Mobile Drawer */}
        {onClose && (
          <button 
            onClick={onClose}
            className="md:hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Close Menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>


      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onMouseEnter={(e) => showTooltip(e, item.name)}
              onMouseLeave={hideTooltip}
              className={cn(
                "flex items-center rounded-lg py-2.5 transition-all duration-200 relative group",
                isCollapsed ? "justify-center px-0 mx-1" : "gap-3 px-3 mx-0",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                isActive ? "" : "text-muted-foreground group-hover:text-foreground"
              )} />
              
              {!isCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis animate-in fade-in duration-200">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t p-4 flex items-center justify-center shrink-0">
        {isCollapsed ? (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" />
        ) : (
          <div className="w-full flex items-center gap-3 px-3 py-1 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Modules
          </div>
        )}
      </div>

      {/* Fixed-position tooltip — renders at viewport level, escapes all overflow containers */}
      {tooltip.visible && (
        <div
          className="fixed z-[9999] rounded-md bg-popover text-popover-foreground px-2.5 py-1.5 text-xs font-semibold shadow-lg border border-border whitespace-nowrap pointer-events-none"
          style={{ left: "88px", top: tooltip.top, transform: "translateY(-50%)" }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
