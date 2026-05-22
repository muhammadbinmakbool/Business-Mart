import React from "react";
import { renderToString } from "react-dom/server";
import { renderIsolatedPrint } from "../runtime/print-renderer";
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
 * Renders the chosen React template to a static HTML string and returns its page orientation.
 */
function renderTemplateToHTML(templateType, data) {
  let htmlString = "";
  let orientation = "portrait";

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

  return { htmlString, orientation };
}

/**
 * Triggers native system printing on the rendered isolated layout.
 */
export function triggerPrint(templateType, data) {
  const { htmlString, orientation } = renderTemplateToHTML(templateType, data);
  renderIsolatedPrint({
    htmlString,
    orientation,
    generationType: "print"
  });
}

/**
 * Generates and downloads a PDF of the rendered isolated layout.
 */
export async function triggerDownloadPDF(templateType, data, filename) {
  const { htmlString, orientation } = renderTemplateToHTML(templateType, data);
  await renderIsolatedPrint({
    htmlString,
    orientation,
    generationType: "pdf",
    filename
  });
}
