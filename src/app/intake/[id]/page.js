import React from "react";
import Link from "next/link";
import { ChevronLeft, Calendar, FileText, User, Package, Weight, Coins, CheckCircle, XCircle, Clock, Edit2 } from "lucide-react";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import { PartyService } from "@/modules/parties/services/PartyService";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import StatusUpdateButtons from "./StatusUpdateButtons";
import DeleteButton from "@/components/DeleteButton";
import { deleteIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { convertRate } from "@/lib/units";
import PrintButtons from "@/print/components/PrintButtons";

export default async function IntakeDetailsPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const intake = await IntakeService.getIntake(params.id);

  const parties = await PartyService.listParties();
  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));

  if (!intake) {
    return <div className="p-8 text-center">Intake transaction not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/intake"
            className="rounded-full p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Intake {intake.intakeNumber}</h1>
            <p className="text-sm text-muted-foreground">Detailed arrival record and payments.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href={`/intake/${intake.id}/edit`}
            className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Link>
          <DeleteButton 
            id={intake.id} 
            deleteAction={deleteIntakeAction} 
            redirectPath="/intake" 
            label="Intake" 
            buttonText="Delete"
          />
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-bold uppercase border",
            intake.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
            intake.status === "SOLD" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
            intake.status === "CLEARED" ? "bg-blue-100 text-blue-700 border-blue-200" :
            "bg-rose-100 text-rose-700 border-rose-200"
          )}>
            {intake.status}
          </div>
        </div>
      </div>

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

            <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t">
              <div className="bg-muted/30 p-4 rounded-lg space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Quantity</span>
                <div className="text-2xl font-bold">{intake.bagCount || 0} <span className="text-sm font-normal text-muted-foreground italic">Bags</span></div>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg space-y-1">
                <span className="text-[10px] font-bold uppercase text-primary">Gross Weight</span>
                <div className="text-2xl font-bold text-primary">{Number(intake.grossWeight).toLocaleString()} <span className="text-sm font-normal italic uppercase">{intake.unit === "MAUND" ? "MND" : intake.unit}</span></div>
              </div>
            </div>

            {(intake.status === "SOLD" || intake.status === "CLEARED") && (
              <div className="pt-6 border-t space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Sale & Billing Details</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-600">Net Weight</span>
                    <div className="text-xl font-bold text-emerald-700">
                      {Number(intake.netWeight || 0).toLocaleString()} <span className="text-xs font-normal italic uppercase">{intake.unit === "MAUND" ? "MND" : intake.unit}</span>
                    </div>
                  </div>
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-primary">Selling Rate</span>
                    <div className="text-xl font-bold text-primary">
                      Rs. {Number(intake.rate || 0).toLocaleString()} <span className="text-xs font-normal italic">/ {intake.rateUnit === "MAUND" ? "MND" : "KG"}</span>
                    </div>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-600">Initial Total Amount</span>
                    <div className="text-xl font-bold text-amber-700">
                      Rs. {(() => {
                        const billingWeight = Number(intake.netWeight || intake.grossWeight || 0);
                        const actualRate = convertRate(intake.rate, intake.rateUnit || "KG", intake.unit || "KG", intake.product);
                        return (billingWeight * Number(actualRate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-muted/40 p-4 rounded-xl flex justify-between items-center text-sm border border-muted-foreground/10">
                    <span className="font-semibold text-muted-foreground">Total Bardana Weight</span>
                    <span className="font-bold">{Number(intake.Bardana || 0).toLocaleString()} KG</span>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-xl flex justify-between items-center text-sm border border-muted-foreground/10">
                    <span className="font-semibold text-muted-foreground">Total Khot Refraction</span>
                    <span className="font-bold">{Number(intake.Khot || 0).toLocaleString()} KG</span>
                  </div>
                </div>

                {intake.salesTracks && intake.salesTracks[0] && (
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-center justify-between text-sm">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-blue-800">Buyer Party Link</div>
                      <div className="text-xs text-muted-foreground">Linked buyer: <span className="font-bold text-blue-900">{intake.salesTracks[0].buyer.name}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-900">{Number(intake.salesTracks[0].quantity).toLocaleString()} {intake.unit}</div>
                      <div className="text-xs text-muted-foreground">Rs. {Number(intake.salesTracks[0].sellingRate).toLocaleString()} / {intake.rateUnit || "KG"}</div>
                    </div>
                  </div>
                )}
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

          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Print / Share</h2>
            <PrintButtons
              type="intake"
              data={intake}
              filename={`Intake-${intake.intakeNumber || intake.id}`}
              className="flex-col w-full !items-stretch"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
