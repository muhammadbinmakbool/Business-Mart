import { ActivityLogRepository } from "../repositories/ActivityLogRepository";
import { activityLogSchema } from "../validations/activityLogSchema";

export class ActivityLogService {
  static async createLog(data) {
    const validated = activityLogSchema.parse(data);
    return await ActivityLogRepository.create(validated);
  }

  static async getLogs(filters) {
    return await ActivityLogRepository.getPaged(filters);
  }
}
