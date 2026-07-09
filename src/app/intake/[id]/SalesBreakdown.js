"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FileText, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/formatters/financialFormatter";
import { getUnitLabel } from "@/lib/units";

export default function SalesBreakdown({ salesTracks = [], intake, currencySymbol = "Rs.", decimalPlaces = 2 }) {
  const isWeightRecorded = !!(intake?.isWeightRecorded && Number(intake?.grossWeight || 0) > 0);

  const handleCompleteSale = (trackId) => {
    window.dispatchEvent(new CustomEvent("open-sell-modal", { detail: { salesTrackId: trackId } }));
  };

  return (
    <div className="pt-6 border-t space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <FileText className="h-4.5 w-4.5 text-primary" />
        Sales Breakdown
      </h3>
      <div className="space-y-3">
        {salesTracks.map((track) => {
          const isTrackPending = !isWeightRecorded || Number(track.quantity) === 0;
          const isRemainderTrack = Number(track.quantity) === 0;

          return (
            <div key={track.id} className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="font-semibold text-blue-950 dark:text-blue-100 flex items-center gap-1.5 font-sans">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {track.buyer?.name || "Unknown Buyer"}
                  {isTrackPending && (
                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/50 uppercase animate-pulse">
                      {Number(track.quantity) === 0 ? "In Progress / Weight Pending" : "Weight Pending"}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Sold on: {format(new Date(track.createdAt), "dd MMM yyyy, hh:mm a")}
                </div>
                {track.saleTransaction && (
                  <div className="text-xs font-semibold text-primary mt-1">
                    Invoice: <Link href={`/sales/${track.saleTransaction.id}`} className="hover:underline text-blue-700 dark:text-blue-400">{track.saleTransaction.saleNumber}</Link>
                  </div>
                )}
                
                {/* Complete Sale Trigger */}
                {isTrackPending && (
                  <button
                    onClick={() => handleCompleteSale(track.id)}
                    className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/50 transition-colors flex items-center gap-1.5"
                  >
                    <Scale className="h-3 w-3" />
                    Complete Sale (Record Weight)
                  </button>
                )}
              </div>
              <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end gap-2 border-t sm:border-0 pt-2 sm:pt-0">
                <div className="font-bold text-blue-900 dark:text-blue-200">
                  {isTrackPending ? (
                    isRemainderTrack ? (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 italic">Pending Weighment</span>
                    ) : (
                      <>
                        {Number(track.quantity).toLocaleString()} <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold italic">({getUnitLabel(intake.unit)} - Pending Weighment)</span>
                      </>
                    )
                  ) : (
                    <>
                      {Number(track.quantity).toLocaleString()} <span className="text-xs font-normal uppercase italic">{getUnitLabel(intake.unit)}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(track.sellingRate, "en", currencySymbol, decimalPlaces)} / {getUnitLabel((intake.unit === "BAG" || intake.product?.primaryUnit === "BAG") ? "BAG" : (track.rateUnit || "KG"))}
                </div>
                {isTrackPending && isRemainderTrack ? (
                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/50 italic">
                    Pending Weighment
                  </div>
                ) : (
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30">
                    {formatCurrency(track.baseAmount, "en", currencySymbol, decimalPlaces)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
