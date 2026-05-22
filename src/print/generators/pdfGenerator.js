/**
 * Abstracted PDF Generator utility to prevent library lock-in.
 * If server-side rendering or an alternate library is desired in the future,
 * only this file needs to be updated.
 */
export async function generatePDF(element, filename, options = {}) {
  // Dynamically import html2pdf.js to avoid Next.js SSR build errors
  const html2pdf = (await import("html2pdf.js")).default;

  const opt = {
    margin: options.margin || [12, 10, 12, 10],
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
      orientation: options.orientation || "portrait" 
    },
    ...options
  };

  return html2pdf().set(opt).from(element).save();
}
