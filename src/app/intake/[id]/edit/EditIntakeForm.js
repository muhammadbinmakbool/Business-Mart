"use client";

import React from "react";
import PurchaseEditIntakeForm from "./PurchaseEditIntakeForm";
import ReceiptEditIntakeForm from "./ReceiptEditIntakeForm";

export default function EditIntakeForm({ intake, suppliers, products, buyers = [], allowedActions = {}, featureFlags }) {
  const isPurchase = featureFlags?.intakeMode === "PURCHASE";

  if (isPurchase) {
    return (
      <PurchaseEditIntakeForm
        intake={intake}
        suppliers={suppliers}
        products={products}
        allowedActions={allowedActions}
        featureFlags={featureFlags}
      />
    );
  }

  return (
    <ReceiptEditIntakeForm
      intake={intake}
      suppliers={suppliers}
      products={products}
      buyers={buyers}
      allowedActions={allowedActions}
      featureFlags={featureFlags}
    />
  );
}
