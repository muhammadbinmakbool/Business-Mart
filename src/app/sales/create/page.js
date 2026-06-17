import React from "react";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import SaleForm from "./SaleForm";
import PosBillingClient from "../pos/PosBillingClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getFeatureFlags } from "@/lib/settings/featureFlags";
import { getPrintSettingsAction, getGeneralSettingsAction } from "@/modules/settings/controllers/settingsActions";
import { getMergedDocumentConfig } from "@/print/config/documentConfig";

export const dynamic = "force-dynamic";

export default async function CreateSalePage({ searchParams: searchParamsPromise }) {
  const searchParams = searchParamsPromise ? await searchParamsPromise : {};
  const backUrl = searchParams.backUrl || "/sales";

  // Fetch flags and core data
  const [flags, parties, products] = await Promise.all([
    getFeatureFlags(),
    PartyService.listParties(),
    ProductService.listProducts()
  ]);

  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive);

  // Fetch active adjustments from DB
  const { AdjustmentService } = await import("@/modules/adjustments/services/AdjustmentService");
  const dbAdjustments = await AdjustmentService.listActiveAdjustments();
  
  // Filter buyer adjustments and check feature flags
  let activeBuyerAdjustments = dbAdjustments.filter(
    adj => adj.applicableTo === "BUYER" || adj.applicableTo === "BOTH"
  );
  
  if (!flags.features?.gst) {
    activeBuyerAdjustments = activeBuyerAdjustments.filter(adj => adj.code !== "GST");
  }
  if (!flags.features?.discount) {
    activeBuyerAdjustments = activeBuyerAdjustments.filter(adj => adj.code !== "DISCOUNT");
  }

  // Parse workbench prefill params
  const salesTrackIdsParam = searchParams.salesTrackIds || "";
  const directPrefillsParam = searchParams.directPrefills || "";
  const queryPartyId = searchParams.partyId || "";
  const isPrefilled = searchParams.prefilled === "true" || !!salesTrackIdsParam || !!directPrefillsParam;

  let initialData = null;

  if (salesTrackIdsParam || directPrefillsParam || queryPartyId) {
    initialData = {
      partyId: queryPartyId || "",
      items: [],
      notes: isPrefilled ? "Prefilled from Operational Workbench" : "",
      prefilled: isPrefilled
    };

    if (salesTrackIdsParam) {
      const trackIds = salesTrackIdsParam.split(",").map(id => parseInt(id)).filter(Boolean);
      if (trackIds.length > 0) {
        const { prisma } = await import("@/lib/prisma");
        const tracks = await prisma.salesTrack.findMany({
          where: {
            id: { in: trackIds },
            isDeleted: false
          },
          include: {
            intakeTransaction: true,
            product: true
          }
        });

        for (const track of tracks) {
          const displayRate = Number(track.sellingRate || track.buyingRate || 0);
          const displayWeight = track.netWeight !== null && track.netWeight !== undefined
            ? Number(track.netWeight)
            : Number(track.quantity || 0);

          initialData.items.push({
            productId: track.productId,
            weight: displayWeight,
            rate: displayRate,
            unit: track.intakeTransaction?.unit || track.product?.primaryUnit || "KG",
            rateUnit: track.rateUnit || track.intakeTransaction?.rateUnit || track.product?.primaryUnit || "KG",
            salesTrackId: track.id,
            intakeNumber: track.intakeTransaction?.intakeNumber || null
          });
        }
      }
    }

    if (directPrefillsParam) {
      try {
        const directItems = JSON.parse(directPrefillsParam);
        if (Array.isArray(directItems)) {
          for (const item of directItems) {
            initialData.items.push({
              productId: parseInt(item.productId),
              weight: parseFloat(item.weight) || 0,
              rate: parseFloat(item.rate) || 0,
              unit: item.unit || "KG",
              rateUnit: item.rateUnit || "KG",
              salesTrackId: null,
              intakeNumber: null
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse direct prefilled items:", e);
      }
    }
  }

  // Render POS or Classic experience
  if (flags.salesWorkflow === "POS") {
    const [printSettingsRes, generalSettingsRes] = await Promise.all([
      getPrintSettingsAction(),
      getGeneralSettingsAction()
    ]);
    const printConfig = getMergedDocumentConfig(
      printSettingsRes?.success ? printSettingsRes.settings : {},
      generalSettingsRes?.success ? generalSettingsRes.settings : {}
    );

    return (
      <PosBillingClient 
        buyers={buyers} 
        products={activeProducts} 
        adjustmentDefinitions={activeBuyerAdjustments}
        printConfig={printConfig}
        initialData={initialData}
        flags={flags}
      />
    );
  }

  // Classic Experience
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={backUrl}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Sale Invoice</h1>
          <p className="text-sm text-muted-foreground">Create a new billing record for a buyer.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <SaleForm 
          buyers={buyers} 
          products={activeProducts} 
          adjustmentDefinitions={activeBuyerAdjustments} 
          backUrl={backUrl} 
          initialData={initialData}
          flags={flags}
        />
      </div>
    </div>
  );
}
