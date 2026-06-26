import { WorkflowSettingsProvider } from "@/modules/workflow/core/WorkflowSettingsProvider";
import { WorkflowRuleEngine } from "@/modules/workflow/core/WorkflowRuleEngine";
import { getFeatureFlags } from "@/lib/settings/featureFlags";

export class IntakeWorkflowEngine {
  static async getDefaultStatus() {
    const flags = await getFeatureFlags();
    if (flags.intakeMode === "PURCHASE") {
      return "PENDING";
    }
    const settings = await WorkflowSettingsProvider.loadSettings();
    return WorkflowRuleEngine.getDefaultStatus(settings);
  }

  static async getAllowedActions(intake) {
    const [settings, flags] = await Promise.all([
      WorkflowSettingsProvider.loadSettings(),
      getFeatureFlags()
    ]);

    if (flags.intakeMode === "PURCHASE") {
      return {
        state: {
          canCancel: intake?.status !== "CANCELLED"
        },
        rules: {
          requiresCancellationNotes: settings.requireCancellationNotes === true,
          supportsPartialSell: false,
          requiresBuyer: false
        }
      };
    }

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
