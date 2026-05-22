import React from "react";
import { renderToString } from "react-dom/server";
import { generatePDF } from "../generators/pdfGenerator";
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
 */
function renderTemplateToIframe(templateType, data) {
  let htmlString = "";
  let orientation = "portrait";

  // 1. Map raw data to stable print models & select React Template
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

  // 2. Create target iframe element
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  // 3. Write markup into iframe
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

  // 4. Copy parent stylesheet links and inline styles to iframe for Tailwind compatibility
  const parentStyles = document.querySelectorAll('style, link[rel="stylesheet"]');
  parentStyles.forEach(style => {
    doc.head.appendChild(style.cloneNode(true));
  });

  // 5. Inject central print subsystem styles
  const printSubsystemStyle = doc.createElement("style");
  printSubsystemStyle.textContent = `
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }
      @page {
        size: A4 ${orientation};
        margin: 15mm 12mm 15mm 12mm;
      }
    }
    .print-watermark {
      position: fixed;
      top: 55%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 5.5rem;
      font-weight: 900;
      color: rgba(0, 0, 0, 0.025);
      text-transform: uppercase;
      pointer-events: none;
      white-space: nowrap;
      letter-spacing: 0.5rem;
      z-index: 0;
    }
    .print-container {
      width: 100%;
      box-sizing: border-box;
    }
    .no-break {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  `;
  doc.head.appendChild(printSubsystemStyle);

  return { iframe, doc, orientation };
}

/**
 * Triggers native system printing on the rendered layout.
 */
export function triggerPrint(templateType, data) {
  const { iframe } = renderTemplateToIframe(templateType, data);

  // Wait briefly for style sheets to load before invoking print dialog
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    // Cleanup iframe after print
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 350);
}

/**
 * Generates and downloads a PDF of the rendered layout.
 */
export async function triggerDownloadPDF(templateType, data, filename) {
  const { iframe, doc, orientation } = renderTemplateToIframe(templateType, data);
  const target = doc.getElementById("print-root");

  // Wait briefly for page stylesheet parsing before saving PDF
  setTimeout(async () => {
    try {
      await generatePDF(target, filename, { orientation });
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      document.body.removeChild(iframe);
    }
  }, 350);
}
