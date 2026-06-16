import { AdjustmentRepository } from "../repositories/AdjustmentRepository";
import { adjustmentSchema } from "../validations/adjustmentSchema";
import { emitActivity } from "@/modules/activity-log/activityLogger";

export class AdjustmentService {
  static async listAdjustments() {
    const items = await AdjustmentRepository.getAll();
    return JSON.parse(JSON.stringify(items));
  }

  static async listActiveAdjustments() {
    const items = await AdjustmentRepository.getActive();
    return JSON.parse(JSON.stringify(items));
  }

  static async listAdjustmentsPaginated({
    page = 1,
    limit = 50,
    searchQuery = "",
    applicableTo = "ALL",
    sortField = "displayOrder",
    sortDirection = "asc"
  } = {}) {
    const { clampLimit } = await import("@/lib/pagination");
    const clampedLimit = clampLimit(limit);

    const { items, totalCount } = await AdjustmentRepository.getAllPaginated({
      page,
      limit: clampedLimit,
      searchQuery,
      applicableTo,
      sortField,
      sortDirection
    });

    return {
      items: JSON.parse(JSON.stringify(items)),
      totalCount
    };
  }

  static async getAdjustment(id) {
    const item = await AdjustmentRepository.getById(id);
    return JSON.parse(JSON.stringify(item));
  }

  static async createAdjustment(data) {
    const validatedData = adjustmentSchema.parse(data);

    // 1. Verify unique code
    const existing = await AdjustmentRepository.getByCode(validatedData.code);
    if (existing) {
      throw new Error(`Adjustment code "${validatedData.code}" already exists.`);
    }

    const adjustment = await AdjustmentRepository.create(validatedData);

    await emitActivity({
      entityType: "SYSTEM_SETTING",
      entityId: adjustment.id,
      action: "CREATED",
      description: `Adjustment template "${adjustment.name}" (${adjustment.code}) created`,
      meta: { name: adjustment.name, code: adjustment.code, method: adjustment.method }
    });

    return JSON.parse(JSON.stringify(adjustment));
  }

  static async updateAdjustment(id, data) {
    const validatedData = adjustmentSchema.parse(data);

    const existing = await AdjustmentRepository.getById(id);
    if (!existing) {
      throw new Error("Adjustment definition not found.");
    }

    // 2. Enforce code immutability
    if (existing.code !== validatedData.code) {
      throw new Error("Changing adjustment code is not permitted.");
    }

    // 3. Enforce system-defined protections
    if (existing.isSystemDefined) {
      // Cannot modify core structural fields: method, direction, isSystemDefined
      if (existing.method !== validatedData.method) {
        throw new Error("Changing method on a system-defined adjustment is not permitted.");
      }
      if (existing.direction !== validatedData.direction) {
        throw new Error("Changing direction on a system-defined adjustment is not permitted.");
      }
    }

    const updateData = { ...validatedData };
    // Remove code since it is immutable
    delete updateData.code;

    const adjustment = await AdjustmentRepository.update(id, updateData);

    await emitActivity({
      entityType: "SYSTEM_SETTING",
      entityId: adjustment.id,
      action: "UPDATED",
      description: `Adjustment template "${adjustment.name}" (${adjustment.code}) updated`,
      meta: { name: adjustment.name, code: adjustment.code }
    });

    return JSON.parse(JSON.stringify(adjustment));
  }

  static async deleteAdjustment(id) {
    const existing = await AdjustmentRepository.getById(id);
    if (!existing) {
      throw new Error("Adjustment definition not found.");
    }

    // 4. Enforce system-defined deletion block
    if (existing.isSystemDefined) {
      throw new Error("System-defined adjustments cannot be deleted.");
    }

    const adjustment = await AdjustmentRepository.softDelete(id);

    await emitActivity({
      entityType: "SYSTEM_SETTING",
      entityId: adjustment.id,
      action: "DELETED",
      description: `Adjustment template "${adjustment.name}" (${adjustment.code}) deleted`,
      meta: { name: adjustment.name, code: adjustment.code }
    });

    return JSON.parse(JSON.stringify(adjustment));
  }

  static async toggleAdjustmentStatus(id, isActive) {
    const existing = await AdjustmentRepository.getById(id);
    if (!existing) {
      throw new Error("Adjustment definition not found.");
    }

    // System-defined adjustments must always remain active
    if (existing.isSystemDefined && !isActive) {
      throw new Error("System-defined adjustments cannot be deactivated.");
    }

    const adjustment = await AdjustmentRepository.toggleStatus(id, isActive);

    await emitActivity({
      entityType: "SYSTEM_SETTING",
      entityId: adjustment.id,
      action: "UPDATED",
      description: `Adjustment template "${adjustment.name}" (${adjustment.code}) active status toggled to ${isActive}`,
      meta: { name: adjustment.name, code: adjustment.code, isActive }
    });

    return JSON.parse(JSON.stringify(adjustment));
  }
}
