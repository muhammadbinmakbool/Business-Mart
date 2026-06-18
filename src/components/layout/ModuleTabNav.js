"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ModuleTabNav({ tabs = [], className }) {
  return (
    <div className={cn("border-b border-border/60 mb-6 shrink-0", className)}>
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "pb-3 text-xl font-bold tracking-tight border-b-[3px] transition-all relative top-[2px] cursor-pointer",
              tab.active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground/45 hover:text-muted-foreground/80"
            )}
          >
            {tab.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
