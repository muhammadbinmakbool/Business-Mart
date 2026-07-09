"use client";

import React from "react";
import { CheckCircle, Clock, Lock, Scale, Coins, Truck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkflowProgress({ intake }) {
  const isWeightRecorded = !!(intake?.isWeightRecorded && Number(intake?.grossWeight || 0) > 0);
  const isSold = intake?.status === "SOLD" || intake?.status === "PARTIAL" || intake?.status === "CLEARED";
  const isCleared = intake?.status === "CLEARED";

  const steps = [
    {
      id: "arrival",
      label: "Goods Arrival",
      status: "completed",
      icon: Truck,
      description: "Arrival recorded"
    },
    {
      id: "selling",
      label: "Commercial Sale",
      status: isSold ? "completed" : "pending",
      icon: Coins,
      description: isSold ? "Sold successfully" : "Pending sale recording"
    },
    {
      id: "weighment",
      label: "Physical Weighment",
      status: isWeightRecorded ? "completed" : (isSold ? "warning" : "pending"),
      icon: Scale,
      description: isWeightRecorded ? "Weighment completed" : (isSold ? "Weight Pending" : "Pending weighment")
    },
    {
      id: "finance",
      label: "Finance Settlement",
      status: isCleared ? "completed" : (!isWeightRecorded ? "locked" : "pending"),
      icon: Lock,
      description: isCleared ? "Settled / Cleared" : (!isWeightRecorded ? "Locked (Weight Pending)" : "Ready for Invoicing")
    }
  ];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workflow Progress</h3>
      
      <div className="grid gap-4 md:grid-cols-4 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative flex flex-col items-center text-center p-4 rounded-xl border bg-muted/10">
              {/* Connector line for large screens */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10 text-muted-foreground/30">
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}

              {/* Status Icon Indicator */}
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center mb-3",
                step.status === "completed" && "bg-emerald-100 text-emerald-700",
                step.status === "warning" && "bg-amber-100 text-amber-700 animate-pulse",
                step.status === "pending" && "bg-muted text-muted-foreground",
                step.status === "locked" && "bg-slate-100 text-slate-400"
              )}>
                {step.status === "completed" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Details */}
              <div className="space-y-1">
                <div className="text-sm font-bold tracking-tight text-foreground">{step.label}</div>
                <div className={cn(
                  "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full inline-block",
                  step.status === "completed" && "bg-emerald-50 text-emerald-700 border border-emerald-100",
                  step.status === "warning" && "bg-amber-50 text-amber-700 border border-amber-100",
                  step.status === "pending" && "bg-muted text-muted-foreground",
                  step.status === "locked" && "bg-slate-50 text-slate-500 border border-slate-100"
                )}>
                  {step.status === "completed" ? "Completed" : step.status === "warning" ? "Pending" : step.status === "locked" ? "Locked" : "Pending"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
