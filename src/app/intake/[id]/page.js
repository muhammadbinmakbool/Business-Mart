import React from "react";
import Link from "next/link";
import { Calendar, FileText, User, Package, Weight, Coins, CheckCircle, XCircle, Clock } from "lucide-react";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import { PartyService } from "@/modules/parties/services/PartyService";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import StatusUpdateButtons from "./StatusUpdateButtons";
import WorkflowProgress from "./WorkflowProgress";
import SalesBreakdown from "./SalesBreakdown";
import { deleteIntakeAction, hardDeleteIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { convertRate, normalizeQuantity, getUnitLabel, UNIT_IDS } from "@/lib/units";
import ResponsiveHeader from "@/components/ResponsiveHeader";
import { getPrintSettingsAction, getGeneralSettingsAction } from "@/modules/settings/controllers/settingsActions";
import { IntakeWorkflowEngine } from "@/modules/intake/workflow/IntakeWorkflowEngine";
import { getMergedDocumentConfig } from "@/print/config/documentConfig";
import { formatCurrency } from "@/lib/formatters/financialFormatter";
import { formatIntakeStatus, getIntakeStatusBadgeClass } from "@/lib/formatters/statusFormatter";

export default async function IntakeDetailsPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = await paramsPromise;
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/intake";
  const rawIntake = await IntakeService.getIntake(params.id);

  if (!rawIntake) {
    return <div className="p-8 text-center">Intake transaction not found.</div>;
  }

  const intake = JSON.parse(JSON.stringify(rawIntake));

  const [parties, settingsResult, generalSettingsResult] = await Promise.all([
    PartyService.listParties(),
    getPrintSettingsAction(),
    getGeneralSettingsAction()
  ]);
  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));
  
  const generalSettings = generalSettingsResult?.success ? generalSettingsResult.settings : {};
  const decimalPlaces = generalSettings.decimalPlaces !== undefined ? Number(generalSettings.decimalPlaces) : 2;
  const currencySymbol = generalSettings.currencySymbol || "Rs.";

  const printConfig = getMergedDocumentConfig(
    settingsResult?.success ? settingsResult.settings : {},
    generalSettingsResult?.success ? generalSettingsResult.settings : {}
  );
  const allowedActions = await IntakeWorkflowEngine.getAllowedActions(intake);
  const { getFeatureFlags } = await import("@/lib/settings/featureFlags");
  const flags = await getFeatureFlags();
  const isPurchase = flags.intakeMode === "PURCHASE";

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
        editUrl={intake.status === "PENDING" ? `/intake/${intake.id}/edit?backUrl=${encodeURIComponent(backUrl)}` : null}
        printType="intake"
        printData={intake}
        printFilename={`Intake-${intake.intakeNumber || intake.id}`}
        printConfig={printConfig}
        deleteId={intake.id}
        deleteAction={deleteIntakeAction}
        hardDeleteAction={hardDeleteIntakeAction}
        deleteLabel="Intake"
        deleteRedirect={backUrl}
        statusBadge={
          <div className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
            getIntakeStatusBadgeClass(intake.status)
          )}>
            {formatIntakeStatus(intake.status, flags.intakeMode)}
          </div>
        }
      />

      {/* {!isPurchase && (
        <WorkflowProgress intake={intake} />
      )} */}

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
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Status Update Timestamp</span>
                <div className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  {format(new Date(intake.createdAt), "dd MMM yyyy, hh:mm a")}
                </div>
              </div>
            </div>

            {(() => {
              const packaging = intake.packagingMeta ? (typeof intake.packagingMeta === 'string' ? JSON.parse(intake.packagingMeta) : intake.packagingMeta) : null;
              
              let quantityValueText = "";
              let quantitySubText = "";
              
              if (packaging) {
                // If packaging metadata is saved (e.g. from the helper)
                quantityValueText = `${packaging.count} ${packaging.type}${packaging.count !== 1 ? 's' : ''}`;
                quantitySubText = `× ${packaging.sizePerUnit} ${getUnitLabel(packaging.unitLabel || 'KG')}`;
              } else if (intake.unit === "BAG" || (intake.bagCount !== null && Number(intake.bagCount) > 0)) {
                // Default bag count
                const count = intake.bagCount || 0;
                quantityValueText = `${count} Bag${count !== 1 ? 's' : ''}`;
                const conversionFactor = intake.product?.unitConversion ? Number(intake.product.unitConversion) : 50;
                quantitySubText = `× ${conversionFactor} KG`;
              } else {
                // Non-bag unit, and no helper was used (like Fanta with 100 PACK)
                const isCustom = intake.unit === "PACK" || intake.unit === "BOX";
                if (isCustom) {
                  const conversionFactor = intake.product?.unitConversion ? Number(intake.product.unitConversion) : 1;
                  const label = intake.unit === "PACK" ? "Pack" : "Box";
                  quantityValueText = `${Number(intake.grossWeight)} ${label}${Number(intake.grossWeight) !== 1 ? (intake.unit === "PACK" ? 's' : 'es') : ''}`;
                  quantitySubText = `× ${conversionFactor} PIECE`;
                } else {
                  quantityValueText = `${Number(intake.grossWeight).toLocaleString()}`;
                  quantitySubText = getUnitLabel(intake.unit);
                }
              }

              const arrivalMeta = intake.arrivalMeta ? (typeof intake.arrivalMeta === 'string' ? JSON.parse(intake.arrivalMeta) : intake.arrivalMeta) : null;
              const isFullySold = intake.status === "SOLD" || intake.status === "CLEARED";

              const qTitle = isFullySold ? "Quantity" : "Arrival Packaging";
              const qValueText = (!isFullySold && arrivalMeta?.containerCount) 
                ? `${arrivalMeta.containerCount} ${arrivalMeta.containerType || 'Bag'}${Number(arrivalMeta.containerCount) !== 1 ? 's' : ''}`
                : quantityValueText;
              const qSubText = (!isFullySold && arrivalMeta?.containerCount)
                ? "Declared count upon arrival"
                : quantitySubText;

              const gTitle = isFullySold ? "Gross Quantity" : "Arrival Transport";
              let gValueText = "";
              let gSubText = "";
              if (!isFullySold) {
                if (arrivalMeta?.transportType) {
                  gValueText = `${arrivalMeta.transportType}${arrivalMeta.transportIdentifier ? ` (${arrivalMeta.transportIdentifier})` : ''}`;
                } else {
                  gValueText = "N/A";
                }
                if (arrivalMeta?.deliveredBy) {
                  gSubText = `Driver: ${arrivalMeta.deliveredBy}`;
                } else {
                  gSubText = "No transport details";
                }
              } else {
                if (intake.unit === "BAG") {
                  gValueText = `${Number(intake.baseQuantity).toLocaleString()} KG`;
                } else {
                  gValueText = `${Number(intake.grossWeight).toLocaleString()} ${getUnitLabel(intake.unit)}`;
                }
                gSubText = "Final weighed quantity";
              }

              const rTitle = isFullySold 
                ? "Remaining Quantity" 
                : (intake.status === "PENDING" ? "Weighment Status" : "Remaining Weight");
              
              let rValueText = "";
              let rSubText = "";
              let rColorClass = "text-purple-700 dark:text-purple-400";
              let rBgClass = "bg-purple-500/5 border border-purple-500/10";
              
              if (!isFullySold && intake.status === "PENDING") {
                rValueText = "Pending";
                rSubText = "Weighment has not occurred";
                rColorClass = "text-amber-600 dark:text-amber-400";
                rBgClass = "bg-amber-500/5 border border-amber-500/10";
              } else {
                rValueText = `${Number(intake.remainingWeight || 0).toLocaleString()} ${getUnitLabel(intake.unit)}`;
                rSubText = "Remaining unsold quantity";
              }

              return (
                <div className="grid gap-6 sm:grid-cols-3 pt-4 border-t">
                  <div className="bg-muted/30 p-4 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{qTitle}</span>
                    <div className="text-2xl font-bold flex flex-col items-start">
                      <span>{qValueText}</span>
                      {qSubText && (
                        <span className="text-xs font-normal text-muted-foreground italic leading-none mt-1">
                          {qSubText}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold uppercase text-primary">{gTitle}</span>
                    <div className="text-2xl font-bold text-primary flex flex-col items-start">
                      <span>{gValueText}</span>
                      {gSubText && (
                        <span className="text-xs font-normal text-primary/70 italic leading-none mt-1">
                          {gSubText}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isPurchase && (
                    <div className={`p-4 rounded-lg space-y-1 ${rBgClass}`}>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{rTitle}</span>
                      <div className={`text-2xl font-bold flex flex-col items-start ${rColorClass}`}>
                        <span>{rValueText}</span>
                        {rSubText && (
                          <span className="text-xs font-normal text-muted-foreground italic leading-none mt-1">
                            {rSubText}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {!isPurchase && (Number(intake.Bardana || 0) > 0 || Number(intake.Khot || 0) > 0) && (
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

            {!isPurchase && intake.remainingWeight !== null && intake.remainingWeight !== undefined && Number(intake.remainingWeight) < Number(intake.grossWeight) && (
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 p-4 rounded-xl flex items-center justify-between text-xs pt-3 mt-4">
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest text-[9px]">Sold Consumption Breakdown</div>
                  <div className="text-muted-foreground">
                    Sold: <span className="font-bold text-amber-800 dark:text-amber-300">{(Number(intake.grossWeight) - Number(intake.remainingWeight)).toLocaleString()} {intake.unit}</span> 
                    {" "}({(((Number(intake.grossWeight) - Number(intake.remainingWeight)) / Number(intake.grossWeight)) * 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 rounded uppercase text-[10px]">
                  {intake.status}
                </div>
              </div>
            )}

            {/* Sales Breakdown Section */}
            {!isPurchase && intake.salesTracks && intake.salesTracks.length > 0 && (
              <SalesBreakdown
                salesTracks={intake.salesTracks}
                intake={intake}
                currencySymbol={currencySymbol}
                decimalPlaces={decimalPlaces}
              />
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
                      <div className="text-sm font-semibold">{formatCurrency(advance.amount, "en", currencySymbol, decimalPlaces)}</div>
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
            <StatusUpdateButtons intakeId={intake.id} currentStatus={intake.status} intake={intake} buyers={buyers} allowedActions={allowedActions} featureFlags={flags} />
          </div>
        </div>
      </div>
    </div>
  );
}
