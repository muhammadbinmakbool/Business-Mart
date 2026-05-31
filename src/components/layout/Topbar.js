"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Bell, User, Menu, Settings, LogOut } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useSidebar } from "./SidebarContext";
import { logoutAction } from "@/modules/auth/controllers/authActions";
import Link from "next/link";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { setIsMobileOpen } = useSidebar();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 text-card-foreground relative z-30">
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

        {/* User Profile dropdown menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 border-l pl-4 hover:opacity-85 transition-all text-left focus:outline-none cursor-pointer"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium">Admin User</span>
              <span className="text-xs text-muted-foreground">Administrator</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
              <User className="h-5 w-5 text-primary" />
            </div>
          </button>

          {/* Elegant Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2.5 w-56 rounded-xl border bg-card text-card-foreground shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b text-xs text-muted-foreground sm:hidden">
                <p className="font-semibold text-foreground">Admin User</p>
                <p>Administrator</p>
              </div>

              <Link
                href="/settings?tab=security"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                User Settings
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-semibold rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
