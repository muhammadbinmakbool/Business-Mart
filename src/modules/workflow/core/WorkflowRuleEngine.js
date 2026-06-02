export class WorkflowRuleEngine {
  /**
   * Evaluates if cancellation notes are valid.
   * Throws an error if required by settings but missing or empty.
   */
  static evaluateCancellation(notes, entityName, settings) {
    const requireNotes = settings?.requireCancellationNotes === true;
    if (requireNotes) {
      if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
        throw new Error(`Cancellation notes are required for this ${entityName || "Record"}.`);
      }
    }
  }

  static getDefaultStatus(settings) {
    return settings?.defaultIntakeStatus || "PENDING";
  }

  static supportsPartialSell(settings) {
    return settings?.enablePartialSelling !== false;
  }

  static requiresBuyer(settings) {
    return settings?.requireBuyerBeforeSelling !== false;
  }
}
