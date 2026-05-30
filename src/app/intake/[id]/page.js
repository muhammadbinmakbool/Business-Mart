import React from "react";
import Link from "next/link";
import { Calendar, FileText, User, Package, Weight, Coins, CheckCircle, XCircle, Clock } from "lucide-react";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import { PartyService } from "@/modules/parties/services/PartyService";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import StatusUpdateButtons from "./StatusUpdateButtons";
import { deleteIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { convertRate, normalizeQuantity, getUnitLabel, UNIT_IDS } from "@/lib/units";
import ResponsiveHeader from "@/components/ResponsiveHeader";

export default async function IntakeDetailsPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = await paramsPromise;
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/intake";
  const rawIntake = await IntakeService.getIntake(params.id);

  if (!rawIntake) {
    return <div className="p-8 text-center">Intake transaction not found.</div>;
  }

  const intake = JSON.parse(JSON.stringify(rawIntake));

  const parties = await PartyService.listParties();
  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ResponsiveHeader
        backUrl={backUrl}
        title={
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Intake {intake.intakeNumber}</h1>
            <p className="text-sm text-muted-foreground">Detailed arrival record and payments.</p>
          </div>
        }
        editUrl={intake.status === "PENDING" ? `/intake/${intake.id}/edit` : null}
        printType="intake"
        printData={intake}
        printFilename={`Intake-${intake.intakeNumber || intake.id}`}
        deleteId={intake.id}
        deleteAction={deleteIntakeAction}
        deleteLabel="Intake"
        deleteRedirect="/intake"
        statusBadge={
          <div className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
            intake.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
            intake.status === "PARTIAL" ? "bg-purple-100 text-purple-700 border-purple-200" :
            intake.status === "SOLD" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
            intake.status === "CLEARED" ? "bg-blue-100 text-blue-700 border-blue-200" :
            "bg-rose-100 text-rose-700 border-rose-200"
          )}>
            {intake.status}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Main Info */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Supplier</span>
                <div className="flex items-center gap-2 font-medium">
                  <User className="h-4 w-4 text-primary" />
                  {intake.party.name}
                </div>
                <div className="text-xs text-muted-foreground ml-6">{intake.party.phoneNumber}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Product</span>
                <div className="flex items-center gap-2 font-medium">
                  <Package className="h-4 w-4 text-primary" />
                  {intake.product.name}
                </div>
                <div className="text-xs text-muted-foreground ml-6">Unit: {intake.product.unitType}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Arrival Date</span>
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  {format(new Date(intake.entryDate), "PPPP")}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">System Timestamp</span>
                <div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  {format(new Date(intake.createdAt), "dd MMM yyyy, hh:mm a")}
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3 pt-4 border-t">
              <div className="bg-muted/30 p-4 rounded-lg space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Quantity</span>
                <div className="text-2xl font-bold">{intake.bagCount || 0} <span className="text-sm font-normal text-muted-foreground italic">Bags</span></div>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg space-y-1">
                <span className="text-[10px] font-bold uppercase text-primary">Gross Weight</span>
                <div className="text-2xl font-bold text-primary">
                  {intake.unit === "BAG" ? (
                    <>
                      {Number(intake.normalizedWeight).toLocaleString()} <span className="text-sm font-normal italic uppercase">KG</span>
                    </>
                  ) : (
                    <>
                      {Number(intake.grossWeight).toLocaleString()} <span className="text-sm font-normal italic uppercase">{getUnitLabel(intake.unit)}</span>
                    </>
                  )}
                </div>
              </div>
              {intake.remainingWeight !== null && intake.remainingWeight !== undefined && (
                <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-lg space-y-1">
                  <span className="text-[10px] font-bold uppercase text-purple-600">Remaining Weight</span>
                  <div className="text-2xl font-bold text-purple-700">
                    {Number(intake.remainingWeight).toLocaleString()} <span className="text-sm font-normal italic uppercase">{getUnitLabel(intake.unit)}</span>
                  </div>
                </div>
              )}
            </div>

            {(Number(intake.Bardana || 0) > 0 || Number(intake.Khot || 0) > 0) && (
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                {Number(intake.Bardana || 0) > 0 && (
                  <div className="bg-muted/40 p-4 rounded-xl flex justify-between items-center text-sm border border-muted-foreground/10">
                    <span className="font-semibold text-muted-foreground">Total Bardana Weight</span>
                    <span className="font-bold">{Number(intake.Bardana || 0).toLocaleString()} KG</span>
                  </div>
                )}
                {Number(intake.Khot || 0) > 0 && (
                  <div className="bg-muted/40 p-4 rounded-xl flex justify-between items-center text-sm border border-muted-foreground/10">
                    <span className="font-semibold text-muted-foreground">Total Khot Refraction</span>
                    <span className="font-bold">{Number(intake.Khot || 0).toLocaleString()} KG</span>
                  </div>
                )}
              </div>
            )}

            {intake.remainingWeight !== null && intake.remainingWeight !== undefined && Number(intake.remainingWeight) < Number(intake.grossWeight) && (
              <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-center justify-between text-xs pt-3 mt-4">
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-800 uppercase tracking-widest text-[9px]">Sold Consumption Breakdown</div>
                  <div className="text-muted-foreground">
                    Sold: <span className="font-bold text-amber-950">{(Number(intake.grossWeight) - Number(intake.remainingWeight)).toLocaleString()} {intake.unit}</span> 
                    {" "}({(((Number(intake.grossWeight) - Number(intake.remainingWeight)) / Number(intake.grossWeight)) * 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="font-bold text-amber-900 bg-amber-500/10 px-2 py-0.5 rounded uppercase text-[10px]">
                  {intake.status}
                </div>
              </div>
            )}

            {/* Sales Breakdown Section */}
            {intake.salesTracks && intake.salesTracks.length > 0 && (
              <div className="pt-6 border-t space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                  Sales Breakdown
                </h3>
                <div className="space-y-3">
                  {intake.salesTracks.map((track) => (
                    <div key={track.id} className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {track.buyer?.name || "Unknown Buyer"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sold on: {format(new Date(track.createdAt), "dd MMM yyyy, hh:mm a")}
                        </div>
                        {track.saleTransaction && (
                          <div className="text-xs font-semibold text-primary mt-1">
                            Invoice: <Link href={`/sales/${track.saleTransaction.id}`} className="hover:underline text-blue-700">{track.saleTransaction.saleNumber}</Link>
                          </div>
                        )}
                      </div>
                      <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end gap-2 border-t sm:border-0 pt-2 sm:pt-0">
                        <div className="font-bold text-blue-900">
                          {Number(track.quantity).toLocaleString()} <span className="text-xs font-normal uppercase italic">{getUnitLabel(intake.unit)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Rs. {Number(track.sellingRate).toLocaleString()} / {getUnitLabel(track.rateUnit || "KG")}
                        </div>
                        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Rs. {Number(track.baseAmount).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {intake.notes && (
              <div className="space-y-2 pt-4 border-t">

                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Notes</span>
                <p className="text-sm bg-muted/20 p-3 rounded-md italic">&quot;{intake.notes}&quot;</p>
              </div>
            )}
          </div>

          {/* Advances Section */}
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Advance Payments
            </h2>
            
            {intake.advances.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No advance payments recorded for this intake.</p>
            ) : (
              <div className="space-y-3">
                {intake.advances.map(advance => (
                  <div key={advance.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Rs. {Number(advance.amount).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{advance.notes}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      {format(new Date(advance.createdAt), "dd MMM, hh:mm a")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Status Lifecycle</h2>
            <StatusUpdateButtons intakeId={intake.id} currentStatus={intake.status} intake={intake} buyers={buyers} />
          </div>
        </div>
      </div>
    </div>
  );
}
