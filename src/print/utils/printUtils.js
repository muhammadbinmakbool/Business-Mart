import React from "react";
import { renderToString } from "react-dom/server";
import { renderIsolatedPrint } from "../runtime/print-renderer";
import { resolvePrintTemplate } from "../registry";

/**
 * Renders the chosen React template to a static HTML string and returns its page orientation.
 */
function renderTemplateToHTML(templateType, data, locale = "en", printConfig = null) {
  let mapperArgs = [];
  let rawData = data;

  if (templateType === "settlement") {
    rawData = data.invoice || data;
    mapperArgs = [data.intakeBreakdowns || [], data.summaryAdjustments || []];
  }

  // Resolve template component, perform data mapping and schema validation
  const { Component, mappedData, orientation } = resolvePrintTemplate(
    templateType,
    rawData,
    rawData.version || null, // Auto-pick version if defined in database record
    mapperArgs
  );

  const htmlString = renderToString(<Component data={mappedData} locale={locale} printConfig={printConfig} />);

  return { htmlString, orientation };
}

/**
 * Triggers native system printing on the rendered isolated layout.
 */
export function triggerPrint(templateType, data, locale = "en", printConfig = null) {
  const { htmlString, orientation } = renderTemplateToHTML(templateType, data, locale, printConfig);
  renderIsolatedPrint({
    htmlString,
    orientation: printConfig?.orientation?.toLowerCase() || orientation,
    paperSize: printConfig?.paperSize?.toLowerCase() || "a4",
    generationType: "print"
  });
}

/**
 * Generates and downloads a PDF of the rendered isolated layout.
 */
export async function triggerDownloadPDF(templateType, data, filename, locale = "en", printConfig = null) {
  const { htmlString, orientation } = renderTemplateToHTML(templateType, data, locale, printConfig);
  await renderIsolatedPrint({
    htmlString,
    orientation: printConfig?.orientation?.toLowerCase() || orientation,
    paperSize: printConfig?.paperSize?.toLowerCase() || "a4",
    generationType: "pdf",
    filename
  });
}


