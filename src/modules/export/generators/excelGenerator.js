import * as XLSX from "xlsx";

/**
 * Generates an Excel workbook buffer from flat data objects.
 * Features auto-sized columns and a frozen header row.
 * 
 * @param {Array<Object>} data - Array of flat mapped data objects.
 * @param {string} sheetName - Optional name of the worksheet.
 * @returns {Buffer} Excel file buffer
 */
export function generateExcelBuffer(data, sheetName = "Export") {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // 1. Freeze the first (header) row
  worksheet["!views"] = [
    { state: "frozen", ySplit: 1, activePane: "bottomLeft", paneType: "ySplit" }
  ];

  // 2. Auto-size columns
  if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    const colWidths = headers.map(header => {
      let maxLength = header.length;
      data.forEach(row => {
        const val = row[header];
        if (val !== null && val !== undefined) {
          maxLength = Math.max(maxLength, String(val).length);
        }
      });
      return { wch: maxLength + 3 }; // Add a padding buffer for comfort
    });
    worksheet["!cols"] = colWidths;
  }

  // 3. Write and return buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}
