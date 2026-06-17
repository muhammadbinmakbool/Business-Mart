import { ProductCategoryRepository } from "../repositories/ProductCategoryRepository";
import { emitActivity } from "@/modules/activity-log/activityLogger";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true)
});

export class ProductCategoryService {
  static async listCategories() {
    return await ProductCategoryRepository.findAll();
  }

  static async getCategory(id) {
    return await ProductCategoryRepository.findById(id);
  }

  static async createCategory(data) {
    const validatedData = categorySchema.parse(data);
    const existing = await ProductCategoryRepository.findByName(validatedData.name);
    if (existing) {
      throw new Error(`Category with name "${validatedData.name}" already exists.`);
    }

    const category = await ProductCategoryRepository.create(validatedData);
    await emitActivity({
      entityType: "SYSTEM",
      entityId: category.id,
      action: "CREATED",
      description: `Product category "${category.name}" created`,
      meta: { name: category.name }
    });
    return category;
  }

  static async updateCategory(id, data) {
    const validatedData = categorySchema.partial().parse(data);
    
    if (validatedData.name) {
      const existing = await ProductCategoryRepository.findByName(validatedData.name);
      if (existing && existing.id !== Number(id)) {
        throw new Error(`Category with name "${validatedData.name}" already exists.`);
      }
    }

    const category = await ProductCategoryRepository.update(id, validatedData);
    await emitActivity({
      entityType: "SYSTEM",
      entityId: category.id,
      action: "UPDATED",
      description: `Product category "${category.name}" updated`,
      meta: { name: category.name }
    });
    return category;
  }

  static async deleteCategory(id, userId = 0) {
    const activeProducts = await ProductCategoryRepository.countActiveProducts(id);
    if (activeProducts > 0) {
      throw new Error(`Deletion Blocked: Category has ${activeProducts} active product(s) associated with it.`);
    }

    const softDeletedProducts = await ProductCategoryRepository.countSoftDeletedProducts(id);
    const category = await ProductCategoryRepository.findById(id);
    if (!category) {
      throw new Error("Category not found.");
    }

    await ProductCategoryRepository.delete(id, userId);

    await emitActivity({
      entityType: "SYSTEM",
      entityId: id,
      action: "DELETED",
      description: `Product category "${category.name}" deleted`,
      meta: { name: category.name }
    });

    return {
      success: true,
      warnSoftDeletedProducts: softDeletedProducts > 0,
      softDeletedCount: softDeletedProducts
    };
  }
}
