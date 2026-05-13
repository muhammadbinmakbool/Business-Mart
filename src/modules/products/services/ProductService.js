import { ProductRepository } from "../repositories/ProductRepository";
import { productSchema } from "../validations/productSchema";

export class ProductService {
  static async listProducts() {
    return await ProductRepository.getAll();
  }

  static async getProduct(id) {
    return await ProductRepository.getById(id);
  }

  static async createProduct(data) {
    const validatedData = productSchema.parse(data);
    return await ProductRepository.create(validatedData);
  }

  static async updateProduct(id, data) {
    const validatedData = productSchema.parse(data);
    return await ProductRepository.update(id, validatedData);
  }

  static async toggleProductStatus(id, isActive) {
    return await ProductRepository.toggleStatus(id, isActive);
  }
  static async deleteProduct(id) {
    return await ProductRepository.delete(id);
  }
}
