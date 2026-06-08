import { prisma } from "@/lib/prisma";

export const DEFAULT_INTAKE_WORKFLOW_SETTINGS = {
  defaultIntakeStatus: "PENDING",
  enablePartialSelling: true,
  requireBuyerBeforeSelling: true,
  autoCreateSalesTrack: true,
  requireCancellationNotes: false
};

export class WorkflowSettingsProvider {
  /**
   * Fetches and merges the system-wide intake workflow settings.
   * @returns {Promise<Object>} The resolved settings object.
   */
  static async loadSettings() {
    try {
      const record = await prisma.systemSetting.findUnique({
        where: { key: "intake_workflow_settings" }
      });

      if (!record) {
        return { ...DEFAULT_INTAKE_WORKFLOW_SETTINGS };
      }

      const parsed = JSON.parse(record.value);
      return {
        defaultIntakeStatus: parsed.defaultIntakeStatus ?? DEFAULT_INTAKE_WORKFLOW_SETTINGS.defaultIntakeStatus,
        enablePartialSelling: parsed.enablePartialSelling !== undefined ? !!parsed.enablePartialSelling : DEFAULT_INTAKE_WORKFLOW_SETTINGS.enablePartialSelling,
        requireBuyerBeforeSelling: parsed.requireBuyerBeforeSelling !== undefined ? !!parsed.requireBuyerBeforeSelling : DEFAULT_INTAKE_WORKFLOW_SETTINGS.requireBuyerBeforeSelling,
        autoCreateSalesTrack: true, // System locked dependency
        requireCancellationNotes: parsed.requireCancellationNotes !== undefined ? !!parsed.requireCancellationNotes : DEFAULT_INTAKE_WORKFLOW_SETTINGS.requireCancellationNotes
      };
    } catch (error) {
      console.error("Failed to load intake workflow settings:", error);
      return { ...DEFAULT_INTAKE_WORKFLOW_SETTINGS };
    }
  }
}
