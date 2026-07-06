"use client";

import React from "react";
import PurchaseIntakeForm from "./PurchaseIntakeForm";
import ReceiptIntakeForm from "./ReceiptIntakeForm";

export default function IntakeForm({ suppliers, products, settings, backUrl, featureFlags, adjustmentDefinitions = [] }) {
  const isPurchaseMode = featureFlags?.intakeMode === "PURCHASE";

  if (isPurchaseMode) {
    return (
      <PurchaseIntakeForm
        suppliers={suppliers}
        products={products}
        settings={settings}
        backUrl={backUrl}
        featureFlags={featureFlags}
        adjustmentDefinitions={adjustmentDefinitions}
      />
    );
  }

  return (
    <ReceiptIntakeForm
      suppliers={suppliers}
      products={products}
      settings={settings}
      backUrl={backUrl}
      featureFlags={featureFlags}
      adjustmentDefinitions={adjustmentDefinitions}
    />
  );
}
