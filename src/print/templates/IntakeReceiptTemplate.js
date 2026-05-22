import React from "react";
import BasePrintLayout from "./BasePrintLayout";
import { PRINT_TYPOGRAPHY } from "../theme/typography";
import { PRINT_LAYOUT } from "../theme/layout";
import { t } from "../localization/locale";
import { formatCurrency, formatWeight, formatBags } from "../localization/formatters";

export default function IntakeReceiptTemplate({ data, locale = "en" }) {
  const isRTL = locale === "ur";

  return (
    <BasePrintLayout
      title={t("intakeTitle", locale)}
      documentId={data.documentId}
      date={data.entryDate}
      status={data.status}
      locale={locale}
    >
      <div className="space-y-6">
        {/* Parties and Info Section */}
        <div className={PRINT_LAYOUT.grid2Cols}>
          <div className={PRINT_LAYOUT.card}>
            <h3 className={PRINT_TYPOGRAPHY.sectionHeader}>
              {t("supplierInfo", locale)}
            </h3>
            <div className={PRINT_TYPOGRAPHY.boldText}>{data.party.name}</div>
            <div className={PRINT_TYPOGRAPHY.normalText}>{t("companyPhone", locale)}: {data.party.phone}</div>
            <div className={PRINT_TYPOGRAPHY.mutedText}>{t("supplierInfo", locale)}</div>
          </div>

          <div className={PRINT_LAYOUT.card}>
            <h3 className={PRINT_TYPOGRAPHY.sectionHeader}>
              {t("receiptDetails", locale)}
            </h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <div className="text-slate-500">{t("intakeDate", locale)}:</div>
              <div className="font-semibold text-slate-700">{data.entryDate}</div>
              <div className="text-slate-500">{t("systemTime", locale)}:</div>
              <div className="font-mono text-slate-600">{data.systemTimestamp}</div>
            </div>
          </div>
        </div>

        {/* Product & Weight Section */}
        <div className={PRINT_LAYOUT.tableContainer}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={PRINT_TYPOGRAPHY.tableHeaderRow}>
                <th className={`${PRINT_TYPOGRAPHY.tableHeaderCell} ${isRTL ? "text-right" : ""}`}>{t("productName", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("grossWeight", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("bags", locale)}</th>
                <th className={PRINT_TYPOGRAPHY.tableHeaderCellRight}>{t("deductionMethod", locale)}</th>
              </tr>
            </thead>
            <tbody>
              <tr className={PRINT_TYPOGRAPHY.tableBodyRow}>
                <td className={PRINT_TYPOGRAPHY.tableBodyCell}>
                  <div className="font-bold text-sm text-slate-800">{data.product.name}</div>
                  <div className="text-[9px] text-slate-400 uppercase mt-0.5">Cat: {data.product.category}</div>
                </td>
                <td className={PRINT_TYPOGRAPHY.tableBodyCellRight}>
                  {formatWeight(data.grossWeight, data.unit, locale)}
                </td>
                <td className={PRINT_TYPOGRAPHY.tableBodyCellRight}>
                  {formatBags(data.bagCount, locale)}
                </td>
                <td className={PRINT_TYPOGRAPHY.tableBodyCellRight}>
                  {t("stdRefraction", locale)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Conditional SOLD Section */}
        {data.isSold && data.soldDetails && (
          <div className="border border-emerald-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center rtl:flex-row-reverse">
              <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                {t("soldSummary", locale)}
              </h4>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                SOLD
              </span>
            </div>

            <div className="p-4 grid grid-cols-3 gap-6 bg-emerald-50/10 rtl:flex-row-reverse">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t("buyerParty", locale)}</span>
                <span className="text-xs font-bold text-emerald-950 block">{data.buyer?.name}</span>
                <span className="text-[10px] text-slate-500 block">{t("companyPhone", locale)}: {data.buyer?.phone}</span>
              </div>
              <div className="space-y-2 border-l border-emerald-100 pl-6 col-span-2 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-6">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t("measurementsRate", locale)}</span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
                  <div className="text-slate-500">{t("netWeightBilled", locale)}:</div>
                  <div className="font-bold text-right text-slate-800">
                    {formatWeight(data.soldDetails.netWeight, data.soldDetails.rateUnit, locale)}
                  </div>
                  <div className="text-slate-500">{t("sellingRate", locale)}:</div>
                  <div className="font-bold text-right text-slate-800">
                    {formatCurrency(data.soldDetails.rate, locale)} / {data.soldDetails.rateUnit === "MAUND" || data.soldDetails.rateUnit === "MND" ? (locale === "ur" ? "من" : "MND") : data.soldDetails.rateUnit}
                  </div>
                  <div className="text-slate-500 border-t pt-1">{t("totalBaseValue", locale)}:</div>
                  <div className="font-black text-right text-emerald-700 border-t pt-1 text-sm">
                    {formatCurrency(data.soldDetails.baseAmount, locale)}
                  </div>
                </div>
              </div>
            </div>

            {/* Refraction Breakdown */}
            <div className="border-t border-emerald-100 p-4 bg-emerald-50/5 grid grid-cols-2 gap-4 text-xs font-mono rtl:flex-row-reverse">
              <div className="flex justify-between items-center border-r border-slate-200 pr-4 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-4">
                <span className="text-slate-500">{t("bardanaLabel", locale)}:</span>
                <span className="font-bold text-slate-700">{formatWeight(data.soldDetails.bardanaWeight, "KG", locale)}</span>
              </div>
              <div className="flex justify-between items-center pl-2 rtl:pl-0 rtl:pr-2">
                <span className="text-slate-500">{t("khotLabel", locale)}:</span>
                <span className="font-bold text-slate-700">{formatWeight(data.soldDetails.khotWeight, "KG", locale)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes Section */}
        {data.notes && (
          <div className="border p-4 rounded-lg bg-slate-50/30">
            <h4 className={PRINT_TYPOGRAPHY.notesHeader}>
              {t("internalNotes", locale)}
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

