import React from "react";
import BasePrintLayout from "./BasePrintLayout";

export default function LedgerTemplate({ data }) {
  const isMatched = data.summary?.isMatched;

  return (
    <BasePrintLayout
      title={data.title}
      date={data.period}
      status={isMatched ? "MATCHED" : "MISMATCH / DRIFT"}
      landscape={true}
    >
      <div className="space-y-6">
        {/* Filters and Meta Details */}
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="border p-3 rounded-lg bg-slate-50/50">
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Audit Period</span>
            <span className="font-bold text-slate-800">{data.period}</span>
          </div>
          <div className="border p-3 rounded-lg bg-slate-50/50">
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Active Filters</span>
            <span className="font-medium text-slate-700 block">Supplier: {data.filters.supplier}</span>
            <span className="font-medium text-slate-700 block">Buyer: {data.filters.buyer}</span>
          </div>
          <div className="border p-3 rounded-lg bg-slate-50/50">
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Report Generated</span>
            <span className="font-mono text-slate-600 block">{data.generatedAt}</span>
          </div>
        </div>

        {/* Drift Warnings */}
        {data.drift && data.drift.hasDrift && (
          <div className="border border-rose-200 rounded-lg p-4 bg-rose-50/30 font-mono no-break">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              ⚠️ DRIFT DETECTED IN SAVED SNAPSHOT
            </h4>
            <p className="text-[11px] text-rose-700 leading-relaxed mb-3">
              One or more underlying transactions have been retroactively modified or deleted since this session was closed. 
              Below is the discrepancy between the live recalculations and the historical saved values:
            </p>
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-rose-100 text-[9px] uppercase font-bold text-rose-500">
                  <th className="py-1">Discrepancy Category</th>
                  <th className="py-1 text-right">Saved Value</th>
                  <th className="py-1 text-right">Live Current Value</th>
                  <th className="py-1 text-right">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100/50">
                {data.drift.fields.map((f, idx) => (
                  <tr key={idx} className="font-medium text-rose-950">
                    <td className="py-1.5 uppercase font-bold">{f.field}</td>
                    <td className="py-1.5 text-right">{f.saved}</td>
                    <td className="py-1.5 text-right">{f.live}</td>
                    <td className="py-1.5 text-right font-black text-rose-700">{f.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Side-by-side Reconciliation Totals Card */}
        <div className="grid grid-cols-2 gap-6 no-break">
          {/* Supplier Aggregates */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Supplier Settlements (Inward)
              </h4>
              <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                {data.summary?.supplier.count} Invoices
              </span>
            </div>
            <div className="p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-500">
                <span>Gross Purchase Value:</span>
                <span>Rs. {data.summary?.supplier.gross}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Total Refraction Deductions:</span>
                <span className="text-rose-600">- Rs. {data.summary?.supplier.deductions}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Advances Deducted:</span>
                <span className="text-rose-600">- Rs. {data.summary?.supplier.advances}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t font-black text-slate-800">
                <span>Total Net Supplier Settlements:</span>
                <span className="text-sm">Rs. {data.summary?.supplier.net}</span>
              </div>
            </div>
          </div>

          {/* Buyer Aggregates */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Buyer Billing (Outward)
              </h4>
              <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                {data.summary?.buyer.count} Invoices
              </span>
            </div>
            <div className="p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-500">
                <span>Base Sale Value:</span>
                <span>Rs. {data.summary?.buyer.base}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Total Billing Adjustments:</span>
                <span className={Number(data.summary?.buyer.adjustments.replace(/,/g, '')) >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  Rs. {data.summary?.buyer.adjustments}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t font-black text-slate-800">
                <span>Total Net Buyer Billing:</span>
                <span className="text-sm">Rs. {data.summary?.buyer.net}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Alert Banner */}
        <div className={`p-4 border rounded-xl no-break flex items-center justify-between font-mono ${
          isMatched 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider">
              {isMatched ? "✅ Monthly Reconciliation Balanced" : "⚠️ Reconciliation Mismatch Detected"}
            </div>
            <div className="text-[10px] mt-0.5 opacity-85">
              Formula: Supplier Net Value + Supplier adjustments = Buyer Net Value - Buyer adjustments (Base equivalence matching).
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold tracking-wider block opacity-70">Discrepancy / Drift Difference</span>
            <span className="text-lg font-black">{isMatched ? "Rs. 0.00" : `Rs. ${data.summary?.difference}`}</span>
          </div>
        </div>

        {/* Side-by-Side Transaction Registry tables (Landscape layout allows side-by-side list) */}
        <div className="grid grid-cols-2 gap-6 no-break">
          {/* Supplier Settlements List */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Supplier Settlements
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-[10px] border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 border-b text-[8px] uppercase font-bold text-slate-500">
                    <th className="px-3 py-2">Date / Invoice</th>
                    <th className="px-3 py-2">Supplier</th>
                    <th className="px-3 py-2 text-right">Net Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">No supplier settlements</td>
                    </tr>
                  ) : (
                    data.invoices.map((inv, idx) => (
                      <tr key={idx} className="border-b font-medium text-slate-700 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-800">{inv.number}</div>
                          <div className="text-[8px] text-slate-400">{inv.date}</div>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[120px]">{inv.party}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">Rs. {inv.net}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Buyer Sales List */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Buyer Sales
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-[10px] border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 border-b text-[8px] uppercase font-bold text-slate-500">
                    <th className="px-3 py-2">Date / Invoice</th>
                    <th className="px-3 py-2">Buyer</th>
                    <th className="px-3 py-2 text-right">Net Billed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">No buyer sales</td>
                    </tr>
                  ) : (
                    data.sales.map((sale, idx) => (
                      <tr key={idx} className="border-b font-medium text-slate-700 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-800">{sale.number}</div>
                          <div className="text-[8px] text-slate-400">{sale.date}</div>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[120px]">{sale.party}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">Rs. {sale.net}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </BasePrintLayout>
  );
}
