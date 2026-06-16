"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Sliders, Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";
import AdjustmentsListClient from "@/app/adjustments/AdjustmentsListClient";
import AdjustmentVisibilityCard from "../AdjustmentVisibilityCard";
import { listAdjustmentsAction } from "@/modules/adjustments/controllers/adjustmentActions";
import { getFeatureFlagsAction } from "@/modules/settings/controllers/settingsActions";

function DashboardContent({ userRole }) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("templates");
  const [featureFlags, setFeatureFlags] = useState(null);
  const [adjustmentsData, setAdjustmentsData] = useState({ items: [], totalCount: 0 });
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const page = parseInt(searchParams.get("page")) || 1;
  const limit = parseInt(searchParams.get("limit")) || 50;
  const search = searchParams.get("search") || "";
  const applicableTo = searchParams.get("applicableTo") || "ALL";

  useEffect(() => {
    async function loadFlags() {
      const res = await getFeatureFlagsAction();
      if (res.success) {
        setFeatureFlags(res.flags);
      }
    }
    loadFlags();
  }, []);

  useEffect(() => {
    if (activeTab === "templates") {
      async function fetchAdjustments() {
        setLoadingAdjustments(true);
        const res = await listAdjustmentsAction({
          page,
          limit,
          searchQuery: search,
          applicableTo,
          sortField: "displayOrder",
          sortDirection: "asc"
        });
        if (res.success) {
          setAdjustmentsData({ items: res.items, totalCount: res.totalCount });
        }
        setLoadingAdjustments(false);
      }
      fetchAdjustments();
    }
  }, [activeTab, page, limit, search, applicableTo, refreshTrigger]);

  const allowedAdjustments = useMemo(() => {
    if (!featureFlags) return null;
    const { ADJUSTMENT_TYPES_BUYER, ADJUSTMENT_TYPES_SUPPLIER } = require("@/lib/constants");
    
    const buyer = [
      ...ADJUSTMENT_TYPES_BUYER.filter(type => type !== "GST" && type !== "Discount"),
      ...(featureFlags.features?.gst ? ["GST"] : []),
      ...(featureFlags.features?.discount ? ["Discount"] : [])
    ];
    
    const supplier = [
      ...ADJUSTMENT_TYPES_SUPPLIER.filter(type => type !== "GST" && type !== "Discount"),
      ...(featureFlags.features?.gst ? ["GST"] : []),
      ...(featureFlags.features?.discount ? ["Discount"] : [])
    ];
    
    return { buyer, supplier };
  }, [featureFlags]);

  const tabs = [
    { id: "templates", label: "Configure Templates", icon: Sliders },
    { id: "visibility", label: "Visibility Settings", icon: Eye }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href="/settings"
              className="p-1 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Adjustments & Visibility</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-8">Define billing adjustment templates and configure active visibilities across invoices.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Navigation */}
        <div className="md:col-span-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Tab Content */}
        <div className="md:col-span-4">
          <div className="animate-in fade-in duration-200">
            {activeTab === "templates" ? (
              <AdjustmentsListClient
                adjustments={adjustmentsData.items}
                totalCount={adjustmentsData.totalCount}
                currentPage={page}
                currentLimit={limit}
                currentSearch={search}
                currentApplicableTo={applicableTo}
                onRefresh={triggerRefresh}
              />
            ) : (
              <AdjustmentVisibilityCard allowedAdjustments={allowedAdjustments} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdjustmentsDashboard({ userRole }) {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto py-16 text-center text-muted-foreground animate-pulse text-sm">
        Loading adjustments configuration...
      </div>
    }>
      <DashboardContent userRole={userRole} />
    </Suspense>
  );
}
