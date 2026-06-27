"use client";

import React from "react";

/**
 * DocumentSettlement Component
 * Pure presentation card for payment options.
 * Collects payment amount, payment method, and payment status.
 */
export default function DocumentSettlement({
  values = {},
  onChange,
}) {
  const {
    amountPaid = "",
    paymentMethod = "CASH",
    paymentStatus = "UNPAID",
  } = values;

  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm p-6 space-y-4">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-3">
        Settlement & Payments
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Payment Amount */}
        <div className="flex flex-col gap-2">
          <label htmlFor="amountPaid" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Amount Paid
          </label>
          <input
            id="amountPaid"
            type="number"
            step="any"
            placeholder="0.00"
            value={amountPaid}
            onChange={(e) => onChange("amountPaid", e.target.value)}
            className="rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
          />
        </div>

        {/* Payment Method */}
        <div className="flex flex-col gap-2">
          <label htmlFor="paymentMethod" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Payment Method
          </label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => onChange("paymentMethod", e.target.value)}
            className="rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
          >
            <option value="CASH">Cash</option>
            <option value="BANK">Bank Transfer</option>
            <option value="CREDIT">On Credit</option>
          </select>
        </div>

        {/* Payment Status */}
        <div className="flex flex-col gap-2">
          <label htmlFor="paymentStatus" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Payment Status
          </label>
          <select
            id="paymentStatus"
            value={paymentStatus}
            onChange={(e) => onChange("paymentStatus", e.target.value)}
            className="rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
          >
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
          </select>
        </div>
      </div>
    </div>
  );
}
