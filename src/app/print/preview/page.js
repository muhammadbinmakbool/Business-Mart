import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { printStyles } from "@/print/styles/printStyles";
import { resolvePrintTemplate } from "@/print/registry";
import { LedgerService } from "@/modules/ledger/services/LedgerService";
import PrintPreviewFrame from "./PrintPreviewFrame";

export default async function PrintPreviewPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const type = searchParams.type || "sale";
  const idStr = searchParams.id;
  const id = idStr ? parseInt(idStr) : null;
  const locale = searchParams.locale || "en";

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
          const { Component, mappedData } = resolvePrintTemplate("intake", intake);
          content = <Component data={mappedData} locale={locale} />;
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
          const { Component, mappedData } = resolvePrintTemplate("sale", sale);
          content = <Component data={mappedData} locale={locale} />;
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

          const { Component, mappedData } = resolvePrintTemplate(
            "settlement",
            invoice,
            invoice.version || null,
            [intakeBreakdowns, summaryAdjustments]
          );
          content = <Component data={mappedData} locale={locale} />;
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

        const { Component, mappedData } = resolvePrintTemplate("ledger", data);
        content = <Component data={mappedData} locale={locale} />;
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
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Control Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-card border-b border-border gap-4 shrink-0 text-card-foreground">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            ← Back to Settings
          </Link>
          <span className="text-border">|</span>
          <h1 className="text-lg font-bold tracking-tight text-primary">Print Template Live Editor</h1>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-muted p-1 rounded-lg border border-border">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/print/preview?type=${tab.key}&locale=${locale}${idStr ? `&id=${idStr}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                type === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Language Switcher */}
        <div className="flex bg-muted p-1 rounded-lg border border-border items-center gap-1">
          <Link
            href={`/print/preview?type=${type}&locale=en${idStr ? `&id=${idStr}` : ""}`}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              locale === "en"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            English (LTR)
          </Link>
          <Link
            href={`/print/preview?type=${type}&locale=ur${idStr ? `&id=${idStr}` : ""}`}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              locale === "ur"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            اردو (RTL)
          </Link>
        </div>

        {/* Custom Record Loader */}
        <form className="flex items-center gap-2">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="locale" value={locale} />
          <span className="text-xs text-muted-foreground font-medium">Record ID:</span>
          <input
            type="number"
            name="id"
            placeholder="Latest"
            defaultValue={idStr || ""}
            className="w-20 px-2 py-1 bg-background border border-input rounded text-xs text-center text-foreground focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/95 px-3 py-1 rounded text-xs font-bold transition-all shadow-sm"
          >
            Load
          </button>
        </form>
      </header>

      {/* Preview Workspace */}
      <main className="flex-1 flex flex-col">
        {/* Active Record Indicator */}
        <div className="bg-muted/30 px-6 py-2 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing Template: <span className="font-bold text-foreground uppercase">{type}</span>
          </div>
          <div>
            Active Document: <span className="font-mono text-primary font-bold bg-muted px-2 py-0.5 rounded border border-border">{docIdText}</span>
          </div>
        </div>

        {/* Error or Iframe view */}
        {errorMsg ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-4 bg-muted/10">
            <span className="text-destructive font-bold">⚠️ {errorMsg}</span>
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

