import { ProductRepository } from "../repositories/ProductRepository";
import { productSchema } from "../validations/productSchema";
import { emitActivity } from "@/modules/activity-log/activityLogger";

export class ProductService {
  static async listProducts() {
    return await ProductRepository.getAll();
  }

  static async listProductsWithStock() {
    return await ProductRepository.getAllWithStock();
  }

  static async getProduct(id) {
    return await ProductRepository.getById(id);
  }

  static async createProduct(data) {
    const validatedData = productSchema.parse(data);
    const product = await ProductRepository.create(validatedData);
    await emitActivity({
      entityType: "PRODUCT",
      entityId: product.id,
      action: "CREATED",
      description: `Product "${product.name}" created`,
      meta: { name: product.name, category: product.category, primaryUnit: product.primaryUnit }
    });
    return product;
  }

  static async updateProduct(id, data) {
    const validatedData = productSchema.parse(data);
    const product = await ProductRepository.update(id, validatedData);
    await emitActivity({
      entityType: "PRODUCT",
      entityId: product.id,
      action: "UPDATED",
      description: `Product "${product.name}" updated`,
      meta: { name: product.name, category: product.category, primaryUnit: product.primaryUnit }
    });
    return product;
  }

  static async toggleProductStatus(id, isActive) {
    const product = await ProductRepository.toggleStatus(id, isActive);
    await emitActivity({
      entityType: "PRODUCT",
      entityId: product.id,
      action: "UPDATED",
      description: `Product "${product.name}" status toggled to ${isActive ? "Active" : "Inactive"}`,
      meta: { name: product.name, isActive }
    });
    return product;
  }
  static async deleteProduct(id) {
    const product = await ProductRepository.delete(id);
    await emitActivity({
      entityType: "PRODUCT",
      entityId: product.id,
      action: "DELETED",
      description: `Product "${product.name}" deleted`,
      meta: { name: product.name }
    });
    return product;
  }
}
