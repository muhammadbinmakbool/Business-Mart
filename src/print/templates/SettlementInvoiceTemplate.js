import React from "react";
import BasePrintLayout from "./BasePrintLayout";

export default function SettlementInvoiceTemplate({ data }) {
  return (
    <BasePrintLayout
      title="Settlement Invoice"
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
    >
      <div className="space-y-6">
        {/* Parties and Version metadata */}
        <div className="grid grid-cols-2 gap-6">
          <div className="border p-4 rounded-lg bg-slate-50/50">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">
              Settled With (Supplier)
            </h3>
            <div className="text-sm font-bold text-slate-800">{data.party.name}</div>
            <div className="text-xs text-slate-500 mt-1">Phone: {data.party.phone}</div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">Supplier Account</div>
          </div>

          <div className="border p-4 rounded-lg bg-slate-50/50">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">
              Settlement Version Info
            </h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <div className="text-slate-500">Invoice Version:</div>
              <div className="font-bold text-slate-800">V{data.version}</div>
              <div className="text-slate-500">Generated:</div>
              <div className="font-mono text-slate-600">{data.entryDate}</div>
              {data.isOutdated && (
                <div className="col-span-2 text-[9px] text-rose-600 font-bold uppercase tracking-wider mt-1 animate-pulse">
                  ⚠️ Outdated: Underlying records modified
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Intakes Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Invoiced Goods Intakes
            </h4>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-4 py-2">Intake / Product</th>
                <th className="px-4 py-2 text-right">Gross Weight</th>
                <th className="px-4 py-2 text-right">Rate</th>
                <th className="px-4 py-2 text-right">Gross Value</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <React.Fragment key={item.id || idx}>
                  <tr className="border-b font-medium text-slate-700">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{item.productName}</div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">{item.intakeNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {item.weight} <span className="text-[9px] text-slate-400">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      Rs. {item.rate} / {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      Rs. {item.grossAmount}
                    </td>
                  </tr>

                  {/* Deductions sub-row */}
                  {item.adjustments && item.adjustments.length > 0 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={4} className="px-4 py-2 text-[10px] border-b">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 font-mono pl-4 border-l-2 print-border-primary">
                          <span className="font-bold text-[9px] uppercase text-slate-400">Intake Deductions:</span>
                          {item.adjustments.map((adj, aIdx) => (
                            <span key={aIdx}>
                              {adj.type} ({adj.description}):{" "}
                              <span className={`font-bold ${adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}`}>
                                {adj.direction === "ADD" ? "+" : "-"}Rs. {adj.amount}
                              </span>
                            </span>
                          ))}
                          <span className="font-bold print-text-primary pl-2">
                            Net Intake: Rs. {item.netAmount}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Adjustments Summary */}
        {data.adjustmentsSummary && data.adjustmentsSummary.length > 0 && (
          <div className="border rounded-lg overflow-hidden no-break">
            <div className="px-4 py-2 bg-slate-50 border-b">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Overall Billing Adjustments Summary
              </h4>
            </div>
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-2">Deduction / Addition Type</th>
                  <th className="px-4 py-2">Formula Rules</th>
                  <th className="px-4 py-2 text-right">Total Applied</th>
                </tr>
              </thead>
              <tbody>
                {data.adjustmentsSummary.map((adj, idx) => (
                  <tr key={idx} className="border-b font-medium">
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-slate-700">{adj.type}</div>
                      <div className={`text-[8px] font-bold uppercase mt-0.5 ${adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}`}>
                        {adj.direction}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {adj.rule}
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

        {/* Advances Adjusted Section */}
        {data.advances && data.advances.length > 0 && (
          <div className="border rounded-lg overflow-hidden no-break">
            <div className="px-4 py-2 bg-slate-50 border-b">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Advances Deducted / Repaid
              </h4>
            </div>
            <div className="p-0 font-mono">
              {data.advances.map((adv, idx) => (
                <div key={adv.id || idx} className="flex justify-between items-center text-xs p-3 border-b last:border-b-0">
                  <div>
                    <div className="font-bold text-slate-700">Advance Adjusted</div>
                    <div className="text-[10px] text-slate-400 italic">{adv.notes}</div>
                  </div>
                  <div className="font-bold text-rose-600">- Rs. {adv.amount}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals Summary */}
        <div className="flex justify-end pt-4 no-break">
          <div className="w-80 border rounded-lg overflow-hidden bg-slate-50/30">
            <div className="p-4 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-500">
                <span>Total Gross Value:</span>
                <span className="font-bold text-slate-700">Rs. {data.totals.grossValue}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Total Deductions:</span>
                <span className="font-bold text-rose-600">- Rs. {data.totals.deductions}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Advances Deducted:</span>
                <span className="font-bold text-rose-600">- Rs. {data.totals.advances}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
                <span className="font-bold text-slate-800">Net Payable Amount:</span>
                <span className="text-lg font-black print-text-primary">
                  Rs. {data.totals.finalPayable}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BasePrintLayout>
  );
}
