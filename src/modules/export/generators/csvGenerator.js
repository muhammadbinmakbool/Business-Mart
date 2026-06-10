/**
 * Sanitizes a cell value to prevent CSV Injection (Formula Injection) attacks.
 * If the value starts with dangerous characters (=, +, -, @), it prefixes it with a single quote (').
 * Also converts values to double-quoted strings with escaped inner quotes.
 * 
 * @param {*} value - The raw cell value
 * @returns {string} Sanitized and escaped CSV cell value
 */
function sanitizeCSVCell(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  
  let str = String(value);
  
  // Formula injection prevention: prefix dangerous starting characters with a single quote
  if (/^[=\+\-\@]/.test(str)) {
    str = `'${str}`;
  }
  
  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates a safe CSV string from an array of flat objects.
 * 
 * @param {Array<Object>} data - Array of flat mapped data objects.
 * @returns {string} CSV format text content
 */
export function generateCSVString(data) {
  if (!data || data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  
  const csvHeaders = headers.map(h => sanitizeCSVCell(h)).join(",");
  
  const rows = data.map(row => 
    headers.map(h => sanitizeCSVCell(row[h])).join(",")
  );
  
  return [csvHeaders, ...rows].join("\r\n");
}
