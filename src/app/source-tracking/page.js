export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus, Search, MapPin, ReceiptText, Trash2, Edit } from "lucide-react";
import { SalesTrackService } from "@/modules/sales/services/SalesTrackService";
import { format } from "date-fns";

export default async function SourceTrackingPage() {
  const tracks = await SalesTrackService.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Source Tracking</h1>
          <p className="text-muted-foreground">Manual register for business mapping and informational tracking.</p>
        </div>
        <Link
          href="/source-tracking/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search mapping register..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                <th className="px-4 py-4">Date</th>
                <th className="px-4 py-4">Product</th>
                <th className="px-4 py-4">Supplier</th>
                <th className="px-4 py-4">Buyer</th>
                <th className="px-4 py-4 text-right">Quantity</th>
                <th className="px-4 py-4 text-right">Rates (B/S)</th>
                <th className="px-4 py-4">Ref #</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tracks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground italic">
                    Mapping register is empty.
                  </td>
                </tr>
              ) : (
                tracks.map((track) => (
                  <tr key={track.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3.5 whitespace-nowrap opacity-80 text-xs">
                      {format(new Date(track.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      {track.product?.name || <span className="text-muted-foreground italic">N/A</span>}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      {track.supplier?.name || <span className="text-muted-foreground italic text-[10px] font-normal">No Supplier</span>}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      {track.buyer?.name || <span className="text-muted-foreground italic text-[10px] font-normal">No Buyer</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                      {Number(track.quantity).toLocaleString()} <span className="text-[10px] opacity-40">KG</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[10px]">
                      <div className="text-rose-600/70">B: {track.buyingRate ? Number(track.buyingRate).toLocaleString() : "-"}</div>
                      <div className="text-emerald-600/70">S: {track.sellingRate ? Number(track.sellingRate).toLocaleString() : "-"}</div>
                    </td>
                    <td className="px-4 py-3.5 text-[10px] font-medium space-y-1">

                      {track.saleTransaction && (
                        <div className="text-primary flex items-center gap-1">
                          <ReceiptText className="h-3 w-3" /> {track.saleTransaction.saleNumber}
                        </div>
                      )}
                      {track.intakeTransaction && (
                        <div className="text-emerald-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {track.intakeTransaction.intakeNumber}
                        </div>
                      )}
                      {!track.saleTransaction && !track.intakeTransaction && (
                        <span className="text-muted-foreground italic">No Reference</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Link 
                          href={`/source-tracking/edit/${track.id}`}
                          className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-md"
                         >
                           <Edit className="h-3.5 w-3.5" />
                         </Link>
                         <button className="p-1.5 hover:bg-rose-100 hover:text-rose-600 rounded-md">
                           <Trash2 className="h-3.5 w-3.5" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
