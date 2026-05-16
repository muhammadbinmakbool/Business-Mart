"use client";

import React from "react";
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
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Parties", href: "/parties", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Goods Intake", href: "/intake", icon: ShoppingCart },
  { name: "Supplier Advances", href: "/advances", icon: Coins },
  { name: "Supplier Settlements", href: "/supplier-invoices", icon: ReceiptText },
  { name: "Sales / Billing", href: "/sales", icon: ReceiptText },
  { name: "Source Tracking", href: "/source-tracking", icon: Package },

  { name: "Ledger", href: "/ledger", icon: BookOpen },

  { name: "Rates", href: "/rates", icon: TrendingUp },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold tracking-tight">Business Mart</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Modules (Placeholder)
        </div>
      </div>
    </div>
  );
}
