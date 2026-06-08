"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ResponsiveActions from "./ResponsiveActions";
import { cn } from "@/lib/utils";

export default function ResponsiveHeader({
  backUrl,
  title,
  ...actionsProps
}) {
  const [containerWidth, setContainerWidth] = useState(1000);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!headerRef.current) return;

    // Set initial width
    setContainerWidth(headerRef.current.clientWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(headerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Determine when all actions are collapsed into the dropdown.
  // Based on the thresholds in ResponsiveActions:
  // - showEdit: containerWidth >= 420
  // So all actions are collapsed if containerWidth < 420!
  const isFullyCollapsed = containerWidth < 420;

  return (
    <div
      ref={headerRef}
      className="flex items-center justify-between gap-4 border-b pb-5 w-full"
    >
      <div
        className={cn(
          "flex items-center gap-4 min-w-0 transition-all duration-150",
          isFullyCollapsed ? "flex-1" : "shrink-0"
        )}
      >
        {backUrl && (
          <Link
            href={backUrl}
            className="rounded-full p-2 hover:bg-accent transition-colors shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          {title}
        </div>
      </div>

      <ResponsiveActions
        containerWidth={containerWidth}
        {...actionsProps}
      />
    </div>
  );
}
