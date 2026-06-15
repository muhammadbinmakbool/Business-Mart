import { prisma } from "@/lib/prisma";

export const DEFAULT_FEATURE_FLAGS = {
  version: 1,
  salesWorkflow: "POS",
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
    
    return {
      version: parsed.version || 1,
      salesWorkflow: parsed.salesWorkflow || DEFAULT_FEATURE_FLAGS.salesWorkflow,
      modules: {
        ...DEFAULT_FEATURE_FLAGS.modules,
        ...(parsed.modules || {})
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
