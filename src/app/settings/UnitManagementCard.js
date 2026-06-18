"use client";

import React from "react";
import Link from "next/link";
import { Scale, Layers, ArrowRight } from "lucide-react";

export default function UnitManagementCard() {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <Scale className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Database Unit Configuration</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Configure the dynamic, database-backed units of measure and categories used for all intake, sales, POS, and inventory transactions.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Link 
          href="/settings/unit-categories"
          className="flex items-center justify-between p-4 rounded-xl border bg-accent/15 hover:bg-accent/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Unit Categories</div>
              <div className="text-xs text-muted-foreground">Manage Weight, Liquid, and Count categories</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
        </Link>

        <Link 
          href="/settings/units"
          className="flex items-center justify-between p-4 rounded-xl border bg-accent/15 hover:bg-accent/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Units of Measure</div>
              <div className="text-xs text-muted-foreground">Manage KG, Maund, Litres, and custom scales</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
