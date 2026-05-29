import React from "react";
import BasePrintLayout from "./BasePrintLayout";
import { PRINT_TYPOGRAPHY } from "../theme/typography";
import { PRINT_LAYOUT } from "../theme/layout";
import { t } from "../localization/locale";
import { formatCurrency, formatWeight } from "../localization/formatters";
import { UNIT_IDS } from "@/lib/units";

export default function SaleInvoiceTemplate({ data, locale = "en" }) {
  const isRTL = locale === "ur";

  return (
    <BasePrintLayout
      title={t("saleTitle", locale)}
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
      locale={locale}
    >
      <div className="space-y-6">
        {/* Parties and Invoice Meta */}
        <div className={PRINT_LAYOUT.grid2Cols}>
          <div className={PRINT_LAYOUT.card}>
            <h3 className={PRINT_TYPOGRAPHY.sectionHeader}>
              {t("billedTo", locale)}
            </h3>
            <div className={PRINT_TYPOGRAPHY.boldText}>{data.party.name}</div>
            <div className={PRINT_TYPOGRAPHY.normalText}>{t("companyPhone", locale)}: {data.party.phone}</div>
            <div className={PRINT_TYPOGRAPHY.mutedText}>{t("billedTo", locale)}</div>
          </div>

          <div className={PRINT_LAYOUT.card}>
            <h3 className={PRINT_TYPOGRAPHY.sectionHeader}>
              {t("invoiceSummary", locale)}
            </h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <div className="text-slate-500">{t("invoiceDate", locale)}:</div>
              <div className="font-semibold text-slate-700">{data.entryDate}</div>
              <div className="text-slate-500">{t("systemTime", locale)}:</div>
              <div className="font-mono text-slate-600">{data.systemTimestamp}</div>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className={PRINT_LAYOUT.tableContainer}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={PRINT_TYPOGRAPHY.tableHeaderRow}>
                <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("productName", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("netWeightBilled", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("rate", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("amount", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={item.id || idx} className={PRINT_TYPOGRAPHY.tableBodyRow}>
                  <td className={PRINT_TYPOGRAPHY.tableBodyCell}>
                    <div className="font-bold text-slate-800">{item.productName}</div>
                  </td>
                  <td className={PRINT_TYPOGRAPHY.tableBodyCellRight}>
                    {formatWeight(item.weight, item.unit, locale)}
                  </td>
                  <td className={PRINT_TYPOGRAPHY.tableBodyCellRight}>
                    {formatCurrency(item.rate, locale)} / {item.rateUnit === UNIT_IDS.MAUND || item.rateUnit === "MND" ? (locale === "ur" ? "من" : "MND") : item.rateUnit}
                  </td>
                  <td className={`${PRINT_TYPOGRAPHY.tableBodyCellRight} text-slate-800 font-bold`}>
                    {formatCurrency(item.amount, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Adjustments Section */}
        {data.adjustments && data.adjustments.length > 0 && (
          <div className={PRINT_LAYOUT.tableContainer}>
            <div className="px-4 py-2 bg-slate-50 border-b">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {t("adjustmentsTitle", locale)}
              </h4>
            </div>
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("adjustmentType", locale)}</th>
                  <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("calcMethod", locale)}</th>
                  <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("calculated", locale)}</th>
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
                      {adj.direction === "ADD" ? "+" : "-"} {formatCurrency(adj.amount, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary */}
        <div className={PRINT_LAYOUT.flexEnd}>
          <div className="w-80 border rounded-lg overflow-hidden bg-slate-50/30">
            <div className="p-4 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>{t("baseTotalVal", locale)}:</span>
                <span className="font-bold text-slate-700">{formatCurrency(data.totals.baseAmount, locale)}</span>
              </div>
              {data.adjustments && data.adjustments.length > 0 && (
                <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                  <span>{t("totalAdjs", locale)}:</span>
                  <span className={`font-bold ${Number(data.totals.totalAdjustments.replace(/,/g, '')) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {data.totals.adjustmentsDirection} {formatCurrency(data.totals.totalAdjustments, locale)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-400 text-[10px] rtl:flex-row-reverse">
                <span>{t("totalNetWeight", locale)}:</span>
                <span>{formatWeight(data.totals.totalWeight, UNIT_IDS.KG, locale)}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 rtl:flex-row-reverse">
                <span className="font-bold text-slate-800">{t("finalInvTotal", locale)}:</span>
                <span className="text-lg font-black print-text-primary">
                  {formatCurrency(data.totals.finalAmount, locale)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="border p-4 rounded-lg bg-slate-50/30">
            <h4 className={PRINT_TYPOGRAPHY.notesHeader}>
              {t("internalInvNotes", locale)}
            </h4>
            <p className={PRINT_TYPOGRAPHY.notesText}>
              &quot;{data.notes}&quot;
            </p>
          </div>
        )}
      </div>
    </BasePrintLayout>
  );
}

