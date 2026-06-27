import { ERROR_CODES } from "./errorCodes.js";

/**
 * Resolves standard visual presentation properties from error codes or action error responses.
 * Essential for server/client consistency and Urdu or multi-lingual translations later.
 * 
 * @param {string|object} errorOrCode - Either a string code or an error object { code, error, message }
 * @returns {object} { title, message, type, code, metadata }
 */
export function getErrorPresentation(errorOrCode) {
  if (!errorOrCode) {
    return {
      title: ERROR_CODES.UNKNOWN_ERROR.title,
      message: ERROR_CODES.UNKNOWN_ERROR.message,
      type: ERROR_CODES.UNKNOWN_ERROR.type,
      code: "UNKNOWN_ERROR",
      metadata: {}
    };
  }

  // If code is a simple string
  if (typeof errorOrCode === "string") {
    const spec = ERROR_CODES[errorOrCode] || ERROR_CODES.UNKNOWN_ERROR;
    return {
      title: spec.title,
      message: spec.message,
      type: spec.type,
      code: spec.code,
      metadata: {}
    };
  }

  // If it is a structured error object
  let code = errorOrCode.code || "UNKNOWN_ERROR";
  let message = errorOrCode.error || errorOrCode.message;

  // Detect and format Zod validation errors (usually array JSON format)
  if (typeof message === "string" && message.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(message);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
        message = parsed.map(issue => `• ${issue.message}`).join("\n");
        code = "VALIDATION_ERROR";
      }
    } catch (e) {
      // Not a valid JSON or not a Zod error, ignore and keep original
    }
  }

  const spec = ERROR_CODES[code] || ERROR_CODES.UNKNOWN_ERROR;
  const finalMessage = message || spec.message;
  const title = errorOrCode.title || spec.title;
  const type = errorOrCode.type || spec.type;
  const metadata = errorOrCode.metadata || {};

  return {
    title,
    message: finalMessage,
    type,
    code,
    metadata
  };
}
