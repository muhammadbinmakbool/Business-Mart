"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function PrintPreviewFrame({ children, printStyles }) {
  const iframeRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);

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
            }
            #print-root {
              background: white;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
              border-radius: 8px;
              box-sizing: border-box;
              min-height: 297mm; /* Standard A4 height */
              width: 100%;
              max-width: 800px;
              padding: 15mm;
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
  }, [printStyles]);

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center">
      <iframe
        ref={iframeRef}
        className="w-full h-[calc(100vh-8rem)] max-w-5xl border-none shadow-inner"
        title="Print Preview Frame"
      />
      {mountNode && createPortal(children, mountNode)}
    </div>
  );
}
