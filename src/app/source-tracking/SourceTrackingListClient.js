"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, ReceiptText } from "lucide-react";
import { format } from "date-fns";
import { useTableSorting } from "@/hooks/useTableSorting";
import SortableHeader from "@/components/SortableHeader";
import { convertRate, getUnitLabel } from "@/lib/units";
import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";

export default function SourceTrackingListClient({ tracks = [], defaultPreset = "all" }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(() => getDefaultFilterState(defaultPreset));

  const dateFilteredTracks = useMemo(() => {
    return filterByDateRange(tracks, "createdAt", dateFilter);
  }, [tracks, dateFilter]);

  const filteredTracks = useMemo(() => {
    return dateFilteredTracks.filter((track) => {
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase();
      const matchProduct = track.product?.name?.toLowerCase().includes(query);
      const matchSupplier = track.supplier?.name?.toLowerCase().includes(query);
      const matchBuyer = track.buyer?.name?.toLowerCase().includes(query);
      const matchSaleNumber = track.saleTransaction?.saleNumber?.toLowerCase().includes(query);
      const matchIntakeNumber = track.intakeTransaction?.intakeNumber?.toLowerCase().includes(query);
      return matchProduct || matchSupplier || matchBuyer || matchSaleNumber || matchIntakeNumber;
    });
  }, [dateFilteredTracks, searchQuery]);

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
          <p className="text-muted-foreground">Automated register for business mapping and informational tracking.</p>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <DebouncedSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search mapping register by product, supplier, buyer or invoice #..."
        />
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedTracks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground italic">
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
                    <td className="px-4 py-3.5 text-right font-mono text-[10px] whitespace-nowrap">
                      {(() => {
                        let targetUnit = track.rateUnit || track.intakeTransaction?.rateUnit || "KG";
                        if (track.product?.category === "BAG" || track.product?.primaryUnit === "BAG" || track.intakeTransaction?.unit === "BAG") {
                          targetUnit = "BAG";
                        }
                        const displayUnitLabel = getUnitLabel(targetUnit);
                        const displayBuyingRate = track.buyingRate ? Number(track.buyingRate) : null;
                        const displaySellingRate = track.sellingRate ? Number(track.sellingRate) : null;
                        return (
                          <>
                            <div className="text-rose-600/70">
                              B: {displayBuyingRate !== null ? `Rs. ${Number(displayBuyingRate).toLocaleString()} /${displayUnitLabel}` : "-"}
                            </div>
                            <div className="text-emerald-600/70">
                              S: {displaySellingRate !== null ? `Rs. ${Number(displaySellingRate).toLocaleString()} /${displayUnitLabel}` : "-"}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                      {track.netWeight !== null && track.netWeight !== undefined ? (
                        <>
                          {(() => {
                            let displayWeight = Number(track.netWeight);
                            let displayUnit = track.intakeTransaction?.unit || "KG";
                            if (displayUnit === "BAG") {
                              const gross = Number(track.intakeTransaction?.grossWeight) || 0;
                              const norm = Number(track.intakeTransaction?.normalizedWeight) || 0;
                              const factor = gross > 0 ? (norm / gross) : (track.product?.unitConversion ? Number(track.product.unitConversion) : 1);
                              displayWeight = displayWeight * factor;
                              displayUnit = "KG";
                            }
                            return (
                              <>
                                {displayWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                                <span className="text-[10px] opacity-40 uppercase">
                                  {getUnitLabel(displayUnit)}
                                </span>
                              </>
                            );
                          })()}
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
                        <Link 
                          href={`/sales/${track.saleTransaction.id}?backUrl=/source-tracking`}
                          className="text-primary hover:underline flex items-center gap-1 w-fit"
                        >
                          <ReceiptText className="h-3 w-3" /> {track.saleTransaction.saleNumber}
                        </Link>
                      )}
                      {track.intakeTransaction && (
                        <Link 
                          href={`/intake/${track.intakeTransaction.id}?backUrl=/source-tracking`}
                          className="text-emerald-600 hover:underline flex items-center gap-1 w-fit"
                        >
                          <MapPin className="h-3 w-3" /> {track.intakeTransaction.intakeNumber}
                        </Link>
                      )}
                      {!track.saleTransaction && !track.intakeTransaction && (
                        <span className="text-muted-foreground italic">No Reference</span>
                      )}
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
