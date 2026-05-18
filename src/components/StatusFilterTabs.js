"use client";

import React from "react";
import { cn } from "@/lib/utils";

export default function StatusFilterTabs({ 
  activeTab, 
  onChange, 
  tabs = [] 
}) {
  return (
    <div className="flex flex-wrap gap-2 pb-1 border-b">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border outline-none",
              isActive 
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/15 scale-[1.02]" 
                : "bg-card text-muted-foreground hover:text-foreground border-muted hover:border-muted-foreground/30 hover:bg-muted/10"
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold transition-all",
                isActive 
                  ? "bg-primary-foreground text-primary" 
                  : "bg-muted text-muted-foreground group-hover:bg-muted/80"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
