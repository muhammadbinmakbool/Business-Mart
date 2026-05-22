import React from "react";
import { renderToString } from "react-dom/server";
import { renderIsolatedPrint } from "../runtime/print-renderer";
import { resolvePrintTemplate } from "../registry";

/**
 * Renders the chosen React template to a static HTML string and returns its page orientation.
 */
function renderTemplateToHTML(templateType, data) {
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

  const htmlString = renderToString(<Component data={mappedData} />);

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
