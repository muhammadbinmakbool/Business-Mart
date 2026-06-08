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
import DataTable from "@/components/ui/DataTable";

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

      <DataTable
        data={sortedTracks}
        emptyMessage="Mapping register is empty."
        containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
        sortField={sortField}
        sortDirection={sortDirection}
        onRequestSort={requestSort}
        columns={[
          {
            key: "createdAt",
            label: "Date",
            className: "px-4 py-3.5 whitespace-nowrap opacity-80 text-xs",
            render: (row, val) => format(new Date(val), "dd MMM yyyy"),
          },
          {
            key: "productName",
            label: "Product",
            className: "px-4 py-3.5 font-medium",
            render: (row, val) => val || <span className="text-muted-foreground italic">N/A</span>,
          },
          {
            key: "supplierName",
            label: "Supplier",
            className: "px-4 py-3.5 font-semibold",
            render: (row, val) =>
              val || (
                <span className="text-muted-foreground italic text-[10px] font-normal">
                  No Supplier
                </span>
              ),
          },
          {
            key: "buyerName",
            label: "Buyer",
            className: "px-4 py-3.5 font-semibold",
            render: (row, val) =>
              val || (
                <span className="text-muted-foreground italic text-[10px] font-normal">
                  No Buyer
                </span>
              ),
          },
          {
            key: "sellingRate",
            label: "Rate (Sale)",
            className: "px-4 py-3.5 text-right font-mono text-[10px] whitespace-nowrap",
            render: (row) => {
              let targetUnit = row.rateUnit || row.intakeTransaction?.rateUnit || "KG";
              if (
                row.product?.category === "BAG" ||
                row.product?.primaryUnit === "BAG" ||
                row.intakeTransaction?.unit === "BAG"
              ) {
                targetUnit = "BAG";
              }
              const displayUnitLabel = getUnitLabel(targetUnit);
              const displayBuyingRate = row.buyingRate ? Number(row.buyingRate) : null;
              const displaySellingRate = row.sellingRate ? Number(row.sellingRate) : null;
              return (
                <>
                  <div className="text-rose-600/70">
                    B:{" "}
                    {displayBuyingRate !== null
                      ? `Rs. ${Number(displayBuyingRate).toLocaleString()} /${displayUnitLabel}`
                      : "-"}
                  </div>
                  <div className="text-emerald-600/70">
                    S:{" "}
                    {displaySellingRate !== null
                      ? `Rs. ${Number(displaySellingRate).toLocaleString()} /${displayUnitLabel}`
                      : "-"}
                  </div>
                </>
              );
            },
          },
          {
            key: "netWeight",
            label: "Net Weight",
            className: "px-4 py-3.5 text-right font-mono text-xs",
            render: (row, val) =>
              val !== null && val !== undefined ? (
                <>
                  {(() => {
                    let displayWeight = Number(val);
                    let displayUnit = row.intakeTransaction?.unit || "KG";
                    if (displayUnit === "BAG") {
                      const gross = Number(row.intakeTransaction?.grossWeight) || 0;
                      const norm = Number(row.intakeTransaction?.normalizedWeight) || 0;
                      const factor =
                        gross > 0
                          ? norm / gross
                          : row.product?.unitConversion
                          ? Number(row.product.unitConversion)
                          : 1;
                      displayWeight = displayWeight * factor;
                      displayUnit = "KG";
                    }
                    return (
                      <>
                        {displayWeight.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] opacity-40 uppercase">
                          {getUnitLabel(displayUnit)}
                        </span>
                      </>
                    );
                  })()}
                </>
              ) : (
                <span className="text-muted-foreground opacity-50">-</span>
              ),
          },
          {
            key: "baseAmount",
            label: "Base Amount",
            className:
              "px-4 py-3.5 text-right font-semibold text-amber-700 font-mono text-xs whitespace-nowrap",
            render: (row, val) =>
              val !== null && val !== undefined ? (
                <>Rs. {Number(val).toLocaleString()}</>
              ) : (
                <span className="text-muted-foreground opacity-50">-</span>
              ),
          },
          {
            key: "refNumber",
            label: "Ref #",
            className: "px-4 py-3.5 text-[10px] font-medium space-y-1",
            render: (row) => (
              <>
                {row.saleTransaction && (
                  <Link
                    href={`/sales/${row.saleTransaction.id}?backUrl=/source-tracking`}
                    className="text-primary hover:underline flex items-center gap-1 w-fit"
                  >
                    <ReceiptText className="h-3 w-3" /> {row.saleTransaction.saleNumber}
                  </Link>
                )}
                {row.intakeTransaction && (
                  <Link
                    href={`/intake/${row.intakeTransaction.id}?backUrl=/source-tracking`}
                    className="text-emerald-600 hover:underline flex items-center gap-1 w-fit"
                  >
                    <MapPin className="h-3 w-3" /> {row.intakeTransaction.intakeNumber}
                  </Link>
                )}
                {!row.saleTransaction && !row.intakeTransaction && (
                  <span className="text-muted-foreground italic">No Reference</span>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
