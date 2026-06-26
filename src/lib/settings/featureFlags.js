import { prisma } from "@/lib/prisma";

export const DEFAULT_FEATURE_FLAGS = {
  version: 1,
  intakeMode: "RECEIPT", // "RECEIPT" | "PURCHASE"
  salesWorkflow: "POS",
  salesMode: "HYBRID", // "DIRECT" | "TRACKED" | "HYBRID"
  enableIntakeLinking: true,
  enablePrefilledInvoices: true,
  enableWorkbenchSuggestions: true,
  modules: {
    sourceTracking: true,
    batchTracking: true,
    supplierMapping: true
  },
  features: {
    gst: true,
    discount: true
  }
};

export async function getFeatureFlags() {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "feature_flags" }
    });
    if (!record) {
      return DEFAULT_FEATURE_FLAGS;
    }
    
    const parsed = JSON.parse(record.value);
    const salesMode = parsed.salesMode || DEFAULT_FEATURE_FLAGS.salesMode;
    
    // In-memory resolution of sourceTracking based on salesMode:
    let sourceTracking = true;
    if (salesMode === "TRACKED") {
      sourceTracking = true;
    } else if (salesMode === "DIRECT") {
      sourceTracking = false;
    } else {
      // HYBRID: fallback to the user's manual database setting (persistent)
      sourceTracking = parsed.modules?.sourceTracking !== false;
    }
    
    return {
      version: parsed.version || 1,
      intakeMode: parsed.intakeMode || DEFAULT_FEATURE_FLAGS.intakeMode,
      salesWorkflow: parsed.salesWorkflow || DEFAULT_FEATURE_FLAGS.salesWorkflow,
      salesMode,
      enableIntakeLinking: parsed.enableIntakeLinking !== undefined ? !!parsed.enableIntakeLinking : DEFAULT_FEATURE_FLAGS.enableIntakeLinking,
      enablePrefilledInvoices: parsed.enablePrefilledInvoices !== undefined ? !!parsed.enablePrefilledInvoices : DEFAULT_FEATURE_FLAGS.enablePrefilledInvoices,
      enableWorkbenchSuggestions: parsed.enableWorkbenchSuggestions !== undefined ? !!parsed.enableWorkbenchSuggestions : DEFAULT_FEATURE_FLAGS.enableWorkbenchSuggestions,
      modules: {
        ...DEFAULT_FEATURE_FLAGS.modules,
        ...(parsed.modules || {}),
        sourceTracking
      },
      features: {
        ...DEFAULT_FEATURE_FLAGS.features,
        ...(parsed.features || {})
      }
    };
  } catch (e) {
    console.error("Failed to load feature flags, falling back to defaults", e);
    return DEFAULT_FEATURE_FLAGS;
  }
}

