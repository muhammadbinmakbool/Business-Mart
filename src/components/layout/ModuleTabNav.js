"use client";

import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * ModuleTabNav — Persistent horizontal tab navigation with a sliding underline indicator.
 *
 * When placed in a layout that stays mounted across navigations (e.g. AppLayout),
 * the underline smoothly slides from one tab to the next on route change.
 *
 * @param {Array} tabs  - Array of { name, href } objects. Active tab is auto-detected from the URL.
 * @param {string} className - Optional extra class names for the wrapper.
 */
export default function ModuleTabNav({ tabs = [], className, headerAction }) {
  const pathname = usePathname();
  const containerRef = useRef(null);
  const tabRefs = useRef({});

  // Track the underline position & width
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [hasMounted, setHasMounted] = useState(false);

  // Determine which tab is active based on the current pathname
  const activeIndex = tabs.findIndex((tab) => pathname === tab.href || pathname.startsWith(tab.href + "/"));
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  // Measure the active tab element and position the indicator
  const updateIndicator = () => {
    const activeEl = tabRefs.current[safeActiveIndex];
    const container = containerRef.current;
    if (activeEl && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  };

  // useLayoutEffect to measure before paint — avoids flash
  useLayoutEffect(() => {
    updateIndicator();
  }, [safeActiveIndex, tabs.length]);

  // Mark as mounted after first paint to enable transition
  useEffect(() => {
    // Small delay so the first render places the indicator without transition
    const timer = setTimeout(() => setHasMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Re-measure on window resize
  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [safeActiveIndex]);

  return (
    <div className={cn("relative flex items-center justify-between border-b border-border/60 pb-3 mb-4 shrink-0", className)} ref={containerRef}>
      <div className="flex gap-1">
        {tabs.map((tab, index) => {
          const isActive = index === safeActiveIndex;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              ref={(el) => { tabRefs.current[index] = el; }}
              className={cn(
                "relative px-4 py-2 text-xl font-bold tracking-tight transition-colors duration-200 whitespace-nowrap select-none",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {headerAction && (
        <div className="shrink-0 flex items-center">
          {headerAction}
        </div>
      )}

      {/* Sliding Underline Indicator */}
      <div
        className="absolute bottom-0 h-[3px] bg-primary rounded-full"
        style={{
          left: `${indicator.left}px`,
          width: `${indicator.width}px`,
          transition: hasMounted ? "left 350ms cubic-bezier(0.4, 0, 0.2, 1), width 350ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        }}
      />
    </div>
  );
}
