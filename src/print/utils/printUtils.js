import React from "react";
import { renderToString } from "react-dom/server";
import { generatePDF } from "../generators/pdfGenerator";
import { printStyles } from "../styles/printStyles";
import {
  mapIntakeToPrintModel,
  mapSaleToPrintModel,
  mapSettlementToPrintModel,
  mapLedgerToPrintModel
} from "../mappers/dataMappers";
import IntakeReceiptTemplate from "../templates/IntakeReceiptTemplate";
import SaleInvoiceTemplate from "../templates/SaleInvoiceTemplate";
import SettlementInvoiceTemplate from "../templates/SettlementInvoiceTemplate";
import LedgerTemplate from "../templates/LedgerTemplate";

/**
 * Creates a hidden iframe containing the rendered print layout.
 *
 * IMPORTANT — html2canvas compatibility:
 * We intentionally do NOT copy the parent application's stylesheets into the
 * iframe.  The app uses Tailwind v4 which emits oklch()/lab() CSS color
 * functions that html2canvas (used by html2pdf.js) cannot parse, causing a
 * hard crash.
 *
 * Instead we inject `printStyles` — a self-contained CSS string that uses only
 * hex and rgba colours.  All print template classes must be defined there.
 */
function renderTemplateToIframe(templateType, data) {
  let htmlString = "";
  let orientation = "portrait";

  // 1. Map raw data to stable print models & select React template
  switch (templateType) {
    case "intake": {
      const mapped = mapIntakeToPrintModel(data);
      htmlString = renderToString(<IntakeReceiptTemplate data={mapped} />);
      break;
    }
    case "sale": {
      const mapped = mapSaleToPrintModel(data);
      htmlString = renderToString(<SaleInvoiceTemplate data={mapped} />);
      break;
    }
    case "settlement": {
      const mapped = mapSettlementToPrintModel(
        data.invoice || data,
        data.intakeBreakdowns || [],
        data.summaryAdjustments || []
      );
      htmlString = renderToString(<SettlementInvoiceTemplate data={mapped} />);
      break;
    }
    case "ledger": {
      const mapped = mapLedgerToPrintModel(data);
      htmlString = renderToString(<LedgerTemplate data={mapped} />);
      orientation = "landscape";
      break;
    }
    default:
      throw new Error(`Unsupported template type: ${templateType}`);
  }

  // 2. Create a hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  // 3. Write markup into iframe — NO parent stylesheets included here.
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Document</title>
      </head>
      <body>
        <div id="print-root">${htmlString}</div>
      </body>
    </html>
  `);
  doc.close();

  // 4. Inject isolated print-safe stylesheet (hex/rgba only, no CSS variables).
  //    This is the ONLY stylesheet in the iframe — parent styles are excluded
  //    to prevent html2canvas from crashing on oklch/lab color functions.
  const safeStyleNode = doc.createElement("style");
  safeStyleNode.textContent = printStyles;
  doc.head.appendChild(safeStyleNode);

  // 5. Inject @page rule for correct paper size / orientation
  const pageStyle = doc.createElement("style");
  pageStyle.textContent = `
    @page {
      size: A4 ${orientation};
      margin: ${orientation === "landscape" ? "10mm" : "15mm 12mm 15mm 12mm"};
    }
  `;
  doc.head.appendChild(pageStyle);

  return { iframe, doc, orientation };
}

/**
 * Triggers native browser print dialog on the rendered template layout.
 */
export function triggerPrint(templateType, data) {
  const { iframe } = renderTemplateToIframe(templateType, data);

  // Brief delay allows the iframe document to finish painting before print
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // Remove iframe after the user closes the print dialog
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 350);
}

/**
 * Generates and downloads a PDF of the rendered template layout.
 *
 * html2canvas renders the iframe's #print-root element.  Because the iframe
 * contains only our safe isolated stylesheet (no oklch/lab), html2canvas will
 * not crash on unsupported colour functions.
 */
export async function triggerDownloadPDF(templateType, data, filename) {
  const { iframe, doc, orientation } = renderTemplateToIframe(templateType, data);
  const target = doc.getElementById("print-root");

  // Brief delay allows styles to be applied to the iframe DOM before capture
  setTimeout(async () => {
    try {
      await generatePDF(target, filename, { orientation });
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }
  }, 350);
}
