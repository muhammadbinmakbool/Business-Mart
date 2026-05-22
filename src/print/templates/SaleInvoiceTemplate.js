import React from "react";
import BasePrintLayout from "./BasePrintLayout";

export default function SaleInvoiceTemplate({ data }) {
  return (
    <BasePrintLayout
      title="Sale Invoice"
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
    >
      <div className="space-y-6">
        {/* Parties and Invoice Meta */}
        <div className="grid grid-cols-2 gap-6">
          <div className="border p-4 rounded-lg bg-slate-50/50">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">
              Billed To (Buyer)
            </h3>
            <div className="text-sm font-bold text-slate-800">{data.party.name}</div>
            <div className="text-xs text-slate-500 mt-1">Phone: {data.party.phone}</div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">Buyer Account</div>
          </div>

          <div className="border p-4 rounded-lg bg-slate-50/50">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">
              Invoice Summary
            </h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <div className="text-slate-500">Invoice Date:</div>
              <div className="font-semibold text-slate-700">{data.entryDate}</div>
              <div className="text-slate-500">System Time:</div>
              <div className="font-mono text-slate-600">{data.systemTimestamp}</div>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3 text-right">Net Weight</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={item.id || idx} className="border-b font-medium text-slate-700">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-800">{item.productName}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    {item.weight} <span className="text-[10px] text-slate-400">{item.unit}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    Rs. {item.rate} / {item.rateUnit}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                    Rs. {item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Adjustments Section */}
        {data.adjustments && data.adjustments.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Billing Adjustments & Fees
              </h4>
            </div>
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-2">Fee/Discount Type</th>
                  <th className="px-4 py-2">Calculation Method</th>
                  <th className="px-4 py-2 text-right">Calculated</th>
                </tr>
              </thead>
              <tbody>
                {data.adjustments.map((adj, idx) => (
                  <tr key={adj.id || idx} className="border-b font-medium">
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-slate-700">{adj.type}</div>
                      <div className={`text-[8px] font-bold uppercase mt-0.5 ${adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}`}>
                        {adj.direction}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {adj.method}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}`}>
                      {adj.direction === "ADD" ? "+" : "-"} Rs. {adj.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary */}
        <div className="flex justify-end pt-4 no-break">
          <div className="w-80 border rounded-lg overflow-hidden bg-slate-50/30">
            <div className="p-4 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-500">
                <span>Base Total Value:</span>
                <span className="font-bold text-slate-700">Rs. {data.totals.baseAmount}</span>
              </div>
              {data.adjustments && data.adjustments.length > 0 && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Total Adjustments:</span>
                  <span className={`font-bold ${Number(data.totals.totalAdjustments.replace(/,/g, '')) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {data.totals.adjustmentsDirection} Rs. {data.totals.totalAdjustments}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-400 text-[10px]">
                <span>Total Net Weight:</span>
                <span>{data.totals.totalWeight} KG</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
                <span className="font-bold text-slate-800">Final Invoice Total:</span>
                <span className="text-lg font-black print-text-primary">
                  Rs. {data.totals.finalAmount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="border p-4 rounded-lg bg-slate-50/30">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Internal Invoice Notes
            </h4>
            <p className="text-xs text-slate-600 italic">
              &quot;{data.notes}&quot;
            </p>
          </div>
        )}
      </div>
    </BasePrintLayout>
  );
}
