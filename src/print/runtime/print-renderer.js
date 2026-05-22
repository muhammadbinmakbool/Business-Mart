import { printStyles } from "../styles/printStyles";

/**
 * Isolated Print & PDF Renderer Runtime
 *
 * This runtime creates a hidden iframe, writes print-safe HTML, and injects
 * only hex/rgba CSS. For PDF generation, it loads the html2pdf.js library
 * dynamically inside the iframe's context, forcing html2canvas to execute
 * in the isolated context without inheritance of parent document's Tailwind v4 colors.
 */
export function renderIsolatedPrint({ htmlString, orientation, generationType, filename }) {
  return new Promise((resolve, reject) => {
    // 1. Create target iframe element
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;

    // 2. Write base HTML structure to iframe
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

    // 3. Inject print-safe isolated CSS (hex/rgba colors, no CSS variables)
    const styleNode = doc.createElement("style");
    styleNode.textContent = printStyles;
    doc.head.appendChild(styleNode);

    // 4. Inject @page rule for paper size and orientation
    const pageStyleNode = doc.createElement("style");
    pageStyleNode.textContent = `
      @page {
        size: A4 ${orientation};
        margin: ${orientation === "landscape" ? "10mm" : "15mm 12mm 15mm 12mm"};
      }
    `;
    doc.head.appendChild(pageStyleNode);

    // 5. Handle print or PDF generation
    if (generationType === "print") {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }
      }, 350);
    } else if (generationType === "pdf") {
      console.log("[Print Runtime] Injecting html2pdf script into iframe context...");
      
      // Dynamically load html2pdf script in the iframe context to isolate html2canvas
      const script = doc.createElement("script");
      script.src = window.location.origin + "/api/html2pdf";
      
      script.onload = () => {
        console.log("[Print Runtime] html2pdf script loaded successfully. Starting generation...");
        // Wait briefly for browser layout/style calculations inside iframe
        setTimeout(async () => {
          try {
            const html2pdf = iframe.contentWindow.html2pdf;
            if (!html2pdf) {
              throw new Error("html2pdf library failed to load inside iframe context");
            }

            const target = doc.getElementById("print-root");
            const opt = {
              margin: new iframe.contentWindow.Array(12, 10, 12, 10),
              filename: `${filename}.pdf`,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false
              },
              jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: orientation
              }
            };

            console.log("[Print Runtime] Rendering document and saving PDF...");
            // Use native html2pdf save method which is fully supported and cross-browser safe
            await html2pdf().set(opt).from(target).save();
            console.log("[Print Runtime] Download completed successfully.");
            resolve();
          } catch (err) {
            console.error("[Print Runtime] PDF generation inside iframe failed:", err);
            reject(err);
          } finally {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }
        }, 350);
      };
      script.onerror = () => {
        const err = new Error("Failed to load html2pdf script in iframe context");
        console.error("[Print Runtime]", err);
        reject(err);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      };
      doc.head.appendChild(script);
    }
  });
}
