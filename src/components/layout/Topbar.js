"use client";

import React from "react";
import { Sun, Moon, Bell, User, Menu } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useSidebar } from "./SidebarContext";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { setIsMobileOpen } = useSidebar();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 text-card-foreground">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="flex md:hidden items-center justify-center rounded-md p-2 hover:bg-accent text-foreground transition-colors"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative flex items-center justify-center rounded-full p-2 hover:bg-accent transition-colors"
          title="Toggle Theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </button>
        
        <button className="rounded-full p-2 hover:bg-accent transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-l pl-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">Admin User</span>
            <span className="text-xs text-muted-foreground">Administrator</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
