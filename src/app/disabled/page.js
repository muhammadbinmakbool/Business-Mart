"use client";

import React from "react";
import Link from "next/link";
import { Sliders, ArrowLeft } from "lucide-react";

export default function FeatureDisabledPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center">
      <div className="max-w-md w-full space-y-6 bg-card border rounded-2xl p-8 shadow-lg transition-all hover:shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 animate-pulse">
          <Sliders className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Feature Disabled</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This module has been disabled by system configuration. Please contact your system administrator to enable it.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl transition-all shadow-md hover:-translate-y-0.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
