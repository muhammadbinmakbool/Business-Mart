import { ERROR_CODES } from "./errorCodes";

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
  const code = errorOrCode.code || "UNKNOWN_ERROR";
  const spec = ERROR_CODES[code] || ERROR_CODES.UNKNOWN_ERROR;

  // Custom metadata and message overrides from error object
  const message = errorOrCode.error || errorOrCode.message || spec.message;
  const title = errorOrCode.title || spec.title;
  const type = errorOrCode.type || spec.type;
  const metadata = errorOrCode.metadata || {};

  return {
    title,
    message,
    type,
    code,
    metadata
  };
}
