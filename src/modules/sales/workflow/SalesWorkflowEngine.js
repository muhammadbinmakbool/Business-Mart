import { WorkflowSettingsProvider } from "@/modules/workflow/core/WorkflowSettingsProvider";
import { WorkflowRuleEngine } from "@/modules/workflow/core/WorkflowRuleEngine";

export class SalesWorkflowEngine {
  static async getAllowedActions(sale) {
    const settings = await WorkflowSettingsProvider.loadSettings();
    return {
      state: {
        canCancel: sale?.status !== "CANCELLED"
      },
      rules: {
        requiresCancellationNotes: settings.requireCancellationNotes === true,
        supportsPartialSell: false,
        requiresBuyer: false
      }
    };
  }

  static async validateCancellation(notes) {
    const settings = await WorkflowSettingsProvider.loadSettings();
    WorkflowRuleEngine.evaluateCancellation(notes, "Sale", settings);
  }
}
