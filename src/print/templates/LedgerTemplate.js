import React from "react";
import BasePrintLayout from "./BasePrintLayout";
import { PRINT_TYPOGRAPHY } from "../theme/typography";
import { PRINT_LAYOUT } from "../theme/layout";
import { t } from "../localization/locale";
import { formatCurrency } from "../localization/formatters";

export default function LedgerTemplate({ data, locale = "en" }) {
  const isMatched = data.summary?.isMatched;
  const isRTL = locale === "ur";

  return (
    <BasePrintLayout
      title={data.title}
      date={data.period}
      status={isMatched ? "MATCHED" : "MISMATCH / DRIFT"}
      landscape={true}
      locale={locale}
    >
      <div className="space-y-6">
        {/* Filters and Meta Details */}
        <div className="grid grid-cols-3 gap-4 text-xs rtl:flex-row-reverse">
          <div className={PRINT_LAYOUT.card}>
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">{t("auditPeriod", locale)}</span>
            <span className="font-bold text-slate-800">{data.period}</span>
          </div>
          <div className={PRINT_LAYOUT.card}>
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">{t("activeFilters", locale)}</span>
            <span className="font-medium text-slate-700 block">{t("supplier", locale)}: {data.filters.supplier}</span>
            <span className="font-medium text-slate-700 block">{t("buyer", locale)}: {data.filters.buyer}</span>
          </div>
          <div className={PRINT_LAYOUT.card}>
            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-1">{t("reportGenerated", locale)}</span>
            <span className="font-mono text-slate-600 block">{data.generatedAt}</span>
          </div>
        </div>

        {/* Drift Warnings */}
        {data.drift && data.drift.hasDrift && (
          <div className="border border-rose-200 rounded-lg p-4 bg-rose-50/30 font-mono no-break">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-2 flex items-center gap-2 rtl:flex-row-reverse">
              ⚠️ {t("driftDetected", locale)}
            </h4>
            <p className="text-[11px] text-rose-700 leading-relaxed mb-3">
              {t("driftDescription", locale)}
            </p>
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-rose-100 text-[9px] uppercase font-bold text-rose-500">
                  <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("discrepancyCategory", locale)}</th>
                  <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("savedValue", locale)}</th>
                  <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("liveValue", locale)}</th>
                  <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("difference", locale)}</th>
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
        <div className="grid grid-cols-2 gap-6 no-break rtl:flex-row-reverse">
          {/* Supplier Aggregates */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center rtl:flex-row-reverse">
              <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                {t("supplierSettlementsInward", locale)}
              </h4>
              <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                {data.summary?.supplier.count} Invoices
              </span>
            </div>
            <div className="p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>Gross Purchase Value:</span>
                <span>{formatCurrency(data.summary?.supplier.gross, locale)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>Total Refraction Deductions:</span>
                <span className="text-rose-600">- {formatCurrency(data.summary?.supplier.deductions, locale)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>Advances Deducted:</span>
                <span className="text-rose-600">- {formatCurrency(data.summary?.supplier.advances, locale)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t font-black text-slate-800 rtl:flex-row-reverse">
                <span>Total Net Supplier Settlements:</span>
                <span className="text-sm">{formatCurrency(data.summary?.supplier.net, locale)}</span>
              </div>
            </div>
          </div>

          {/* Buyer Aggregates */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center rtl:flex-row-reverse">
              <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                {t("buyerBillingOutward", locale)}
              </h4>
              <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">
                {data.summary?.buyer.count} Invoices
              </span>
            </div>
            <div className="p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>Base Sale Value:</span>
                <span>{formatCurrency(data.summary?.buyer.base, locale)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>Total Billing Adjustments:</span>
                <span className={Number(data.summary?.buyer.adjustments.replace(/,/g, '')) >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {formatCurrency(data.summary?.buyer.adjustments, locale)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t font-black text-slate-800 rtl:flex-row-reverse">
                <span>Total Net Buyer Billing:</span>
                <span className="text-sm">{formatCurrency(data.summary?.buyer.net, locale)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Alert Banner */}
        <div className={`p-4 border rounded-xl no-break flex items-center justify-between font-mono rtl:flex-row-reverse ${
          isMatched 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider">
              {isMatched ? `✅ ${t("reconciliationBalanced", locale)}` : `⚠️ ${t("reconciliationMismatch", locale)}`}
            </div>
            <div className="text-[10px] mt-0.5 opacity-85">
              {t("reconciliationFormula", locale)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold tracking-wider block opacity-70">{t("driftDifference", locale)}</span>
            <span className="text-lg font-black">{isMatched ? formatCurrency(0, locale) : formatCurrency(data.summary?.difference, locale)}</span>
          </div>
        </div>

        {/* Side-by-Side Transaction Registry tables (Landscape layout allows side-by-side list) */}
        <div className="grid grid-cols-2 gap-6 no-break rtl:flex-row-reverse">
          {/* Supplier Settlements List */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              {t("supplierSettlements", locale)}
            </h4>
            <div className={PRINT_LAYOUT.tableContainer}>
              <table className="w-full text-left text-[10px] border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 border-b text-[8px] uppercase font-bold text-slate-500">
                    <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("date", locale)} / {t("no", locale)}</th>
                    <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("supplier", locale)}</th>
                    <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("netSettled", locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">{t("noSupplierSettlements", locale)}</td>
                    </tr>
                  ) : (
                    data.invoices.map((inv, idx) => (
                      <tr key={idx} className="border-b font-medium text-slate-700 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-800">{inv.number}</div>
                          <div className="text-[8px] text-slate-400">{inv.date}</div>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[120px]">{inv.party}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(inv.net, locale)}</td>
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
              {t("buyerSales", locale)}
            </h4>
            <div className={PRINT_LAYOUT.tableContainer}>
              <table className="w-full text-left text-[10px] border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 border-b text-[8px] uppercase font-bold text-slate-500">
                    <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("date", locale)} / {t("no", locale)}</th>
                    <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("buyer", locale)}</th>
                    <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("netBilled", locale)}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-slate-400 italic">{t("noBuyerSales", locale)}</td>
                    </tr>
                  ) : (
                    data.sales.map((sale, idx) => (
                      <tr key={idx} className="border-b font-medium text-slate-700 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-800">{sale.number}</div>
                          <div className="text-[8px] text-slate-400">{sale.date}</div>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[120px]">{sale.party}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(sale.net, locale)}</td>
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

