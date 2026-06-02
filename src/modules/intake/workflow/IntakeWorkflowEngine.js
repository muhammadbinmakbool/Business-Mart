import { WorkflowSettingsProvider } from "@/modules/workflow/core/WorkflowSettingsProvider";
import { WorkflowRuleEngine } from "@/modules/workflow/core/WorkflowRuleEngine";

export class IntakeWorkflowEngine {
  static async getDefaultStatus() {
    const settings = await WorkflowSettingsProvider.loadSettings();
    return WorkflowRuleEngine.getDefaultStatus(settings);
  }

  static async getAllowedActions(intake) {
    const settings = await WorkflowSettingsProvider.loadSettings();
    return {
      state: {
        canCancel: intake?.status !== "CANCELLED"
      },
      rules: {
        requiresCancellationNotes: settings.requireCancellationNotes === true,
        supportsPartialSell: WorkflowRuleEngine.supportsPartialSell(settings),
        requiresBuyer: WorkflowRuleEngine.requiresBuyer(settings)
      }
    };
  }

  static async validateCancellation(notes) {
    const settings = await WorkflowSettingsProvider.loadSettings();
    WorkflowRuleEngine.evaluateCancellation(notes, "Intake", settings);
  }
}
