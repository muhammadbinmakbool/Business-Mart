import { WorkflowSettingsProvider } from "@/modules/workflow/core/WorkflowSettingsProvider";
import { WorkflowRuleEngine } from "@/modules/workflow/core/WorkflowRuleEngine";

export class SupplierWorkflowEngine {
  static async getAllowedActions(invoice) {
    const settings = await WorkflowSettingsProvider.loadSettings();
    return {
      state: {
        canCancel: invoice?.status !== "CANCELLED" && invoice?.status !== "SUPERSEDED"
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
    WorkflowRuleEngine.evaluateCancellation(notes, "Supplier Invoice", settings);
  }
}
