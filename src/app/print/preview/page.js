import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { printStyles } from "@/print/styles/printStyles";
import {
  mapIntakeToPrintModel,
  mapSaleToPrintModel,
  mapSettlementToPrintModel,
  mapLedgerToPrintModel
} from "@/print/mappers/dataMappers";
import IntakeReceiptTemplate from "@/print/templates/IntakeReceiptTemplate";
import SaleInvoiceTemplate from "@/print/templates/SaleInvoiceTemplate";
import SettlementInvoiceTemplate from "@/print/templates/SettlementInvoiceTemplate";
import LedgerTemplate from "@/print/templates/LedgerTemplate";
import { LedgerService } from "@/modules/ledger/services/LedgerService";
import PrintPreviewFrame from "./PrintPreviewFrame";

export default async function PrintPreviewPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const type = searchParams.type || "sale";
  const idStr = searchParams.id;
  const id = idStr ? parseInt(idStr) : null;

  let content = null;
  let errorMsg = "";
  let docIdText = "Latest Record";

  try {
    switch (type) {
      case "intake": {
        let intake;
        if (id) {
          intake = await prisma.intakeTransaction.findUnique({
            where: { id },
            include: { party: true, product: true }
          });
          docIdText = `ID: ${id}`;
        } else {
          intake = await prisma.intakeTransaction.findFirst({
            orderBy: { createdAt: "desc" },
            include: { party: true, product: true }
          });
        }
        if (!intake) {
          errorMsg = "No Intake Transactions found in database.";
        } else {
          const mapped = mapIntakeToPrintModel(intake);
          content = <IntakeReceiptTemplate data={mapped} />;
          docIdText = intake.intakeNumber;
        }
        break;
      }
      case "sale": {
        let sale;
        if (id) {
          sale = await prisma.saleTransaction.findUnique({
            where: { id },
            include: {
              party: true,
              items: { include: { product: true } },
              adjustments: true
            }
          });
          docIdText = `ID: ${id}`;
        } else {
          sale = await prisma.saleTransaction.findFirst({
            orderBy: { createdAt: "desc" },
            include: {
              party: true,
              items: { include: { product: true } },
              adjustments: true
            }
          });
        }
        if (!sale) {
          errorMsg = "No Sale Transactions found in database.";
        } else {
          const mapped = mapSaleToPrintModel(sale);
          content = <SaleInvoiceTemplate data={mapped} />;
          docIdText = sale.saleNumber;
        }
        break;
      }
      case "settlement": {
        let invoice;
        if (id) {
          invoice = await prisma.supplierInvoice.findUnique({
            where: { id },
            include: {
              party: true,
              items: { 
                include: { 
                  intake: { include: { product: true } },
                  adjustments: true
                } 
              },
              advances: true
            }
          });
          docIdText = `ID: ${id}`;
        } else {
          invoice = await prisma.supplierInvoice.findFirst({
            orderBy: { createdAt: "desc" },
            include: {
              party: true,
              items: { 
                include: { 
                  intake: { include: { product: true } },
                  adjustments: true
                } 
              },
              advances: true
            }
          });
        }
        if (!invoice) {
          errorMsg = "No Supplier Settlement Invoices found in database.";
        } else {
          // Calculate breakdowns
          const { calculateSupplierDeductions } = require("@/lib/financial");
          const { intakeBreakdowns } = calculateSupplierDeductions(
            invoice.items.map(item => ({
              ...item.intake,
              id: item.intakeTransactionId,
              netWeight: Number(item.weight),
              rate: Number(item.rate),
              adjustments: (item.adjustments || []).map(adj => ({
                adjustmentType: adj.adjustmentType,
                method: adj.method,
                value: Number(adj.value),
                direction: adj.direction
              }))
            }))
          );

          const summaryAdjustments = [];
          invoice.items.forEach(item => {
            (item.adjustments || []).forEach(adj => {
              const existing = summaryAdjustments.find(
                a => a.adjustmentType === adj.adjustmentType &&
                     a.method === adj.method &&
                     Number(a.value) === Number(adj.value) &&
                     a.direction === adj.direction
              );
              if (existing) {
                existing.calculatedAmount += Number(adj.calculatedAmount);
              } else {
                summaryAdjustments.push({
                  adjustmentType: adj.adjustmentType,
                  method: adj.method,
                  value: Number(adj.value),
                  calculatedAmount: Number(adj.calculatedAmount),
                  direction: adj.direction
                });
              }
            });
          });

          const mapped = mapSettlementToPrintModel(invoice, intakeBreakdowns, summaryAdjustments);
          content = <SettlementInvoiceTemplate data={mapped} />;
          docIdText = invoice.invoiceNumber;
        }
        break;
      }
      case "ledger": {
        const now = new Date();
        const start = format(startOfMonth(now), "yyyy-MM-dd");
        const end = format(endOfMonth(now), "yyyy-MM-dd");
        const ledgerResult = await LedgerService.getLiveReconciliationData({
          startDate: start,
          endDate: end,
          partyType: "ALL"
        });

        const data = {
          startDate: start,
          endDate: end,
          partyType: "ALL",
          suppliers: ledgerResult.suppliers || [],
          buyers: ledgerResult.buyers || [],
          totals: ledgerResult.totals || {}
        };

        const mapped = mapLedgerToPrintModel(data);
        content = <LedgerTemplate data={mapped} />;
        docIdText = `${start} to ${end}`;
        break;
      }
      default: {
        errorMsg = `Unsupported preview type: "${type}"`;
      }
    }
  } catch (err) {
    console.error("Failed to render preview template:", err);
    errorMsg = `Error rendering template: ${err.message}`;
  }

  const tabs = [
    { key: "sale", label: "Sale Invoice" },
    { key: "intake", label: "Intake Receipt" },
    { key: "settlement", label: "Supplier Settlement" },
    { key: "ledger", label: "Ledger Report" }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Control Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
          <span className="text-slate-700">|</span>
          <h1 className="text-lg font-bold text-emerald-400 tracking-tight">Print Template Live Editor</h1>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/print/preview?type=${tab.key}`}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                type === tab.key
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Custom Record Loader */}
        <form className="flex items-center gap-2">
          <input type="hidden" name="type" value={type} />
          <span className="text-xs text-slate-400 font-medium">Record ID:</span>
          <input
            type="number"
            name="id"
            placeholder="Latest"
            defaultValue={idStr || ""}
            className="w-20 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-center text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs font-bold text-white transition-all"
          >
            Load
          </button>
        </form>
      </header>

      {/* Preview Workspace */}
      <main className="flex-1 flex flex-col">
        {/* Active Record Indicator */}
        <div className="bg-slate-950/50 px-6 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Template: <span className="font-bold text-white uppercase">{type}</span>
          </div>
          <div>
            Active Document: <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded">{docIdText}</span>
          </div>
        </div>

        {/* Error or Iframe view */}
        {errorMsg ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-4">
            <span className="text-red-400 font-bold">⚠️ {errorMsg}</span>
            <p className="text-xs max-w-md">
              Try creating a new record in the app or load a specific ID using the selector above.
            </p>
          </div>
        ) : (
          <div className="flex-1">
            <PrintPreviewFrame printStyles={printStyles}>
              {content}
            </PrintPreviewFrame>
          </div>
        )}
      </main>
    </div>
  );
}
