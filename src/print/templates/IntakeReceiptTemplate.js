import React from "react";
import BasePrintLayout from "./BasePrintLayout";

export default function IntakeReceiptTemplate({ data }) {
  return (
    <BasePrintLayout
      title="Goods Intake Receipt"
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
    >
      <div className="space-y-6">
        {/* Parties and Info Section */}
        <div className="grid grid-cols-2 gap-6">
          <div className="border p-4 rounded-lg bg-slate-50/50">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">
              Supplier Info
            </h3>
            <div className="text-sm font-bold text-slate-800">{data.party.name}</div>
            <div className="text-xs text-slate-500 mt-1">Phone: {data.party.phone}</div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">Supplier Account</div>
          </div>

          <div className="border p-4 rounded-lg bg-slate-50/50">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">
              Receipt Details
            </h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <div className="text-slate-500">Intake Date:</div>
              <div className="font-semibold text-slate-700">{data.entryDate}</div>
              <div className="text-slate-500">System Time:</div>
              <div className="font-mono text-slate-600">{data.systemTimestamp}</div>
            </div>
          </div>
        </div>

        {/* Product & Weight Section */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3 text-right">Gross Weight</th>
                <th className="px-4 py-3 text-right">Bags</th>
                <th className="px-4 py-3 text-right">Deduction Method</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-medium text-slate-700 border-b">
                <td className="px-4 py-4">
                  <div className="font-bold text-sm text-slate-800">{data.product.name}</div>
                  <div className="text-[9px] text-slate-400 uppercase mt-0.5">Cat: {data.product.category}</div>
                </td>
                <td className="px-4 py-4 text-right font-mono text-sm">
                  {data.grossWeight} <span className="text-[10px] text-slate-400">{data.unit}</span>
                </td>
                <td className="px-4 py-4 text-right font-mono text-sm">
                  {data.bagCount ? `${data.bagCount} Bags` : "N/A"}
                </td>
                <td className="px-4 py-4 text-right text-slate-500">
                  Standard Refraction
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Conditional SOLD Section */}
        {data.isSold && data.soldDetails && (
          <div className="border border-emerald-200 rounded-lg overflow-hidden animate-in slide-in-from-top-2">
            <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                Outward Sale & Refraction Summary
              </h4>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                SOLD
              </span>
            </div>

            <div className="p-4 grid grid-cols-3 gap-6 bg-emerald-50/10">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Buyer Party</span>
                <span className="text-xs font-bold text-emerald-950 block">{data.buyer?.name}</span>
                <span className="text-[10px] text-slate-500 block">Phone: {data.buyer?.phone}</span>
              </div>
              <div className="space-y-2 border-l border-emerald-100 pl-6 col-span-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Measurements & Rate</span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                  <div className="text-slate-500">Net Weight (Billed):</div>
                  <div className="font-bold text-right text-slate-800">
                    {data.soldDetails.netWeight} {data.unit === "MAUND" ? "MND" : data.unit}
                  </div>
                  <div className="text-slate-500">Selling Rate:</div>
                  <div className="font-bold text-right text-slate-800">
                    Rs. {data.soldDetails.rate} / {data.soldDetails.rateUnit}
                  </div>
                  <div className="text-slate-500 border-t pt-1">Total Base Value:</div>
                  <div className="font-black text-right text-emerald-700 border-t pt-1 text-sm">
                    Rs. {data.soldDetails.baseAmount}
                  </div>
                </div>
              </div>
            </div>

            {/* Refraction Breakdown */}
            <div className="border-t border-emerald-100 p-4 bg-emerald-50/5 grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="flex justify-between items-center border-r border-slate-200 pr-4">
                <span className="text-slate-500">Bardana (Tare Weight):</span>
                <span className="font-bold text-slate-700">{data.soldDetails.bardanaWeight} KG</span>
              </div>
              <div className="flex justify-between items-center pl-2">
                <span className="text-slate-500">Khot (Impurity Deduction):</span>
                <span className="font-bold text-slate-700">{data.soldDetails.khotWeight} KG</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes Section */}
        {data.notes && (
          <div className="border p-4 rounded-lg bg-slate-50/30">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Internal Notes
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
