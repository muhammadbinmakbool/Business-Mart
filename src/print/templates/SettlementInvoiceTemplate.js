import React from "react";
import BasePrintLayout from "./BasePrintLayout";
import { PRINT_TYPOGRAPHY } from "../theme/typography";
import { PRINT_LAYOUT } from "../theme/layout";
import { t } from "../localization/locale";
import { formatCurrency, formatWeight } from "../localization/formatters";

export default function SettlementInvoiceTemplate({ data, locale = "en" }) {
  const isRTL = locale === "ur";

  return (
    <BasePrintLayout
      title={t("settlementTitle", locale)}
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
      locale={locale}
    >
      <div className="space-y-6">
        {/* Parties and Version metadata */}
        <div className={PRINT_LAYOUT.grid2Cols}>
          <div className={PRINT_LAYOUT.card}>
            <h3 className={PRINT_TYPOGRAPHY.sectionHeader}>
              {t("settledWith", locale)}
            </h3>
            <div className={PRINT_TYPOGRAPHY.boldText}>{data.party.name}</div>
            <div className={PRINT_TYPOGRAPHY.normalText}>{t("companyPhone", locale)}: {data.party.phone}</div>
            <div className={PRINT_TYPOGRAPHY.mutedText}>{t("settledWith", locale)}</div>
          </div>

          <div className={PRINT_LAYOUT.card}>
            <h3 className={PRINT_TYPOGRAPHY.sectionHeader}>
              {t("settlementVersionInfo", locale)}
            </h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <div className="text-slate-500">{t("invoiceVersion", locale)}:</div>
              <div className="font-bold text-slate-800">V{data.version}</div>
              <div className="text-slate-500">{t("generated", locale)}:</div>
              <div className="font-mono text-slate-600">{data.entryDate}</div>
              {data.isOutdated && (
                <div className="col-span-2 text-[9px] text-rose-600 font-bold uppercase tracking-wider mt-1 animate-pulse">
                  ⚠️ {t("outdatedWarning", locale)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Intakes Table */}
        <div className={PRINT_LAYOUT.tableContainer}>
          <div className="px-4 py-2 bg-slate-50 border-b">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {t("invoicedGoodsIntakes", locale)}
            </h4>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("intakeProduct", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("grossWeight", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("rate", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("grossValue", locale)}</th>
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
                      {formatWeight(item.weight, item.unit, locale)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(item.rate, locale)} / {item.unit === "MAUND" || item.unit === "MND" ? (locale === "ur" ? "من" : "MND") : item.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {formatCurrency(item.grossAmount, locale)}
                    </td>
                  </tr>

                  {/* Deductions sub-row */}
                  {item.adjustments && item.adjustments.length > 0 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={4} className="px-4 py-2 text-[10px] border-b">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 font-mono pl-4 border-l-2 print-border-primary rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-4">
                          <span className="font-bold text-[9px] uppercase text-slate-400">{t("intakeDeductions", locale)}:</span>
                          {item.adjustments.map((adj, aIdx) => (
                            <span key={aIdx}>
                              {adj.type} ({adj.description}):{" "}
                              <span className={`font-bold ${adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}`}>
                                {adj.direction === "ADD" ? "+" : "-"}{formatCurrency(adj.amount, locale)}
                              </span>
                            </span>
                          ))}
                          <span className="font-bold text-primary pl-2 rtl:pl-0 rtl:pr-2">
                            {t("netIntake", locale)}: {formatCurrency(item.netAmount, locale)}
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
                {t("overallAdjustmentsSummary", locale)}
              </h4>
            </div>
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("deductionAdditionType", locale)}</th>
                  <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("formulaRules", locale)}</th>
                  <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("totalApplied", locale)}</th>
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
                      {adj.direction === "ADD" ? "+" : "-"} {formatCurrency(adj.amount, locale)}
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
                {t("advancesDeductedRepaid", locale)}
              </h4>
            </div>
            <div className="p-0 font-mono">
              {data.advances.map((adv, idx) => (
                <div key={adv.id || idx} className="flex justify-between items-center text-xs p-3 border-b last:border-b-0 rtl:flex-row-reverse">
                  <div>
                    <div className="font-bold text-slate-700">{t("advanceAdjusted", locale)}</div>
                    <div className="text-[10px] text-slate-400 italic">{adv.notes}</div>
                  </div>
                  <div className="font-bold text-rose-600">- {formatCurrency(adv.amount, locale)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals Summary */}
        <div className={PRINT_LAYOUT.flexEnd}>
          <div className="w-80 border rounded-lg overflow-hidden bg-slate-50/30">
            <div className="p-4 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>{t("totalGrossValue", locale)}:</span>
                <span className="font-bold text-slate-700">{formatCurrency(data.totals.grossValue, locale)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>{t("totalDeductions", locale)}:</span>
                <span className="font-bold text-rose-600">- {formatCurrency(data.totals.deductions, locale)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 rtl:flex-row-reverse">
                <span>{t("advancesDeducted", locale)}:</span>
                <span className="font-bold text-rose-600">- {formatCurrency(data.totals.advances, locale)}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 rtl:flex-row-reverse">
                <span className="font-bold text-slate-800">{t("netPayableAmount", locale)}:</span>
                <span className="text-lg font-black text-primary">
                  {formatCurrency(data.totals.finalPayable, locale)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BasePrintLayout>
  );
}

