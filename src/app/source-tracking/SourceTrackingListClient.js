"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, ReceiptText } from "lucide-react";
import { format } from "date-fns";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";

export default function SourceTrackingListClient({ tracks = [] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase();
      const matchProduct = track.product?.name?.toLowerCase().includes(query);
      const matchSupplier = track.supplier?.name?.toLowerCase().includes(query);
      const matchBuyer = track.buyer?.name?.toLowerCase().includes(query);
      const matchSaleNumber = track.saleTransaction?.saleNumber?.toLowerCase().includes(query);
      const matchIntakeNumber = track.intakeTransaction?.intakeNumber?.toLowerCase().includes(query);
      return matchProduct || matchSupplier || matchBuyer || matchSaleNumber || matchIntakeNumber;
    });
  }, [tracks, searchQuery]);

  // Pre-calculate fields for nested sorting
  const mappedTracks = useMemo(() => {
    return filteredTracks.map((track) => ({
      ...track,
      productName: track.product?.name || "",
      supplierName: track.supplier?.name || "",
      buyerName: track.buyer?.name || "",
      refNumber: track.saleTransaction?.saleNumber || track.intakeTransaction?.intakeNumber || "",
    }));
  }, [filteredTracks]);

  const {
    sortedData: sortedTracks,
    sortField,
    sortDirection,
    requestSort,
  } = useTableSorting(mappedTracks, "createdAt", "desc");

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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search mapping register by product, supplier, buyer or invoice #..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                <SortableHeader
                  field="createdAt"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Date
                </SortableHeader>
                <SortableHeader
                  field="productName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Product
                </SortableHeader>
                <SortableHeader
                  field="supplierName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Supplier
                </SortableHeader>
                <SortableHeader
                  field="buyerName"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Buyer
                </SortableHeader>
                <SortableHeader
                  field="sellingRate"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right"
                >
                  Rate (Sale)
                </SortableHeader>
                <SortableHeader
                  field="netWeight"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right"
                >
                  Net Weight
                </SortableHeader>
                <SortableHeader
                  field="baseAmount"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                  className="text-right"
                >
                  Base Amount
                </SortableHeader>
                <SortableHeader
                  field="refNumber"
                  currentSortField={sortField}
                  currentSortDirection={sortDirection}
                  onRequestSort={requestSort}
                >
                  Ref #
                </SortableHeader>
                <th className="px-4 py-3 font-semibold text-center select-none">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedTracks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground italic">
                    Mapping register is empty.
                  </td>
                </tr>
              ) : (
                sortedTracks.map((track) => (
                  <tr key={track.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3.5 whitespace-nowrap opacity-80 text-xs">
                      {format(new Date(track.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3.5 font-medium">
                      {track.productName || <span className="text-muted-foreground italic">N/A</span>}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      {track.supplierName || (
                        <span className="text-muted-foreground italic text-[10px] font-normal">
                          No Supplier
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">
                      {track.buyerName || (
                        <span className="text-muted-foreground italic text-[10px] font-normal">
                          No Buyer
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[10px]">
                      <div className="text-rose-600/70">
                        B: {track.buyingRate ? Number(track.buyingRate).toLocaleString() : "-"}
                      </div>
                      <div className="text-emerald-600/70">
                        S: {track.sellingRate ? Number(track.sellingRate).toLocaleString() : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                      {track.netWeight !== null && track.netWeight !== undefined ? (
                        <>
                          {Number(track.netWeight).toLocaleString()}{" "}
                          <span className="text-[10px] opacity-40 uppercase">
                            {track.intakeTransaction?.unit === "MAUND"
                              ? "MND"
                              : track.intakeTransaction?.unit || "KG"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground opacity-50">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-amber-700 font-mono text-xs whitespace-nowrap">
                      {track.baseAmount !== null && track.baseAmount !== undefined ? (
                        <>Rs. {Number(track.baseAmount).toLocaleString()}</>
                      ) : (
                        <span className="text-muted-foreground opacity-50">-</span>
                      )}
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
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/source-tracking/edit/${track.id}`}
                          className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-md"
                        >
                          {/* We can import Edit from lucide-react if needed, or keep it standard */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3.5 w-3.5"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </Link>
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
