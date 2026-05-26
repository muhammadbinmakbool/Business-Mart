import { ERROR_CODES } from "./errorCodes";

/**
 * Standard structured Application Error extending standard JS Error.
 * Ensures consistent serialization between server actions and client layers.
 */
export class AppError extends Error {
  constructor(code, customMessage = null, metadata = {}) {
    const errorSpec = ERROR_CODES[code] || ERROR_CODES.UNKNOWN_ERROR;
    const finalMessage = customMessage || errorSpec.message;
    
    super(finalMessage);
    
    this.name = "AppError";
    this.code = code;
    this.title = errorSpec.title;
    this.type = errorSpec.type;
    this.metadata = metadata;
    
    // Maintain correct stack trace in V8 (Chrome/Node)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Helper to serialize error to plain JSON object, safe for Next.js server actions.
   */
  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      title: this.title,
      type: this.type,
      metadata: this.metadata
    };
  }

  /**
   * Static helper to serialize standard error objects.
   */
  static toJSON(err) {
    if (err instanceof AppError) {
      return err.toJSON();
    }
    return {
      success: false,
      error: err.message || "An unexpected error occurred",
      code: err.code || "UNKNOWN_ERROR",
      title: err.title || "Unexpected Error",
      type: err.type || "error",
      metadata: err.metadata || {}
    };
  }
}

/**
 * Factory utility to quickly build structured AppErrors
 */
export function createAppError(code, customMessage = null, metadata = {}) {
  return new AppError(code, customMessage, metadata);
}
