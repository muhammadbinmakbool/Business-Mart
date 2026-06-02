"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getMergedDocumentConfig } from "@/print/config/documentConfig";

export default function PrintPreviewFrame({ children, printStyles, printConfig }) {
  const iframeRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);

  const activeConfig = getMergedDocumentConfig(printConfig);
  const paperSize = (activeConfig.paperSize || "A4").toUpperCase();
  const orientation = (activeConfig.orientation || "PORTRAIT").toUpperCase();

  // Determine actual physical layout dimensions in mm for high fidelity preview
  let width = "210mm";
  let minHeight = "297mm";

  if (paperSize === "A4") {
    if (orientation === "LANDSCAPE") {
      width = "297mm";
      minHeight = "210mm";
    } else {
      width = "210mm";
      minHeight = "297mm";
    }
  } else if (paperSize === "A5") {
    if (orientation === "LANDSCAPE") {
      width = "210mm";
      minHeight = "148mm";
    } else {
      width = "148mm";
      minHeight = "210mm";
    }
  } else if (paperSize === "LETTER") {
    if (orientation === "LANDSCAPE") {
      width = "279.4mm";
      minHeight = "215.9mm";
    } else {
      width = "215.9mm";
      minHeight = "279.4mm";
    }
  } else if (paperSize === "LEDGER") {
    if (orientation === "LANDSCAPE") {
      width = "431.8mm";
      minHeight = "279.4mm";
    } else {
      width = "279.4mm";
      minHeight = "431.8mm";
    }
  }

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Preview</title>
          <style>${printStyles}</style>
          <style>
            body {
              background-color: #f1f5f9;
              padding: 2rem 1rem;
              display: flex;
              justify-content: center;
              font-family: ui-sans-serif, system-ui, sans-serif;
              margin: 0;
            }
            #print-root {
              background: white;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
              border-radius: 8px;
              box-sizing: border-box;
              min-height: ${minHeight};
              width: ${width};
              padding: 15mm;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `);
    doc.close();

    setMountNode(doc.getElementById("print-root"));
  }, [printStyles, width, minHeight]);

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center">
      <iframe
        ref={iframeRef}
        className="w-full h-[calc(100vh-8rem)] border-none shadow-inner"
        title="Print Preview Frame"
      />
      {mountNode && createPortal(children, mountNode)}
    </div>
  );
}
