import { ProductRepository } from "../repositories/ProductRepository";
import { productSchema } from "../validations/productSchema";
import { emitActivity } from "@/modules/activity-log/activityLogger";
import { prisma } from "@/lib/prisma";

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
    const productId = parseInt(id);

    const oldProduct = await ProductRepository.getById(productId);
    if (!oldProduct) throw new Error("Product not found");

    const product = await prisma.$transaction(async (tx) => {
      // 1. Update the product
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: validatedData,
      });

      const oldConversion = oldProduct.unitConversion ? Number(oldProduct.unitConversion) : 0;
      const newConversion = updatedProduct.unitConversion ? Number(updatedProduct.unitConversion) : 0;

      // 2. Recalculate unsold stock of BAG-entered intakes if unit conversion changed
      if (oldConversion !== newConversion && newConversion > 0) {
        // Fetch active intakes (PENDING or PARTIAL status) for this product
        const intakes = await tx.intakeTransaction.findMany({
          where: {
            productId,
            status: { in: ["PENDING", "PARTIAL"] }
          }
        });

        for (const intake of intakes) {
          const isProdBag = intake.unit === "BAG";
          if (isProdBag) {
            const grossWeight = Number(intake.grossWeight || 0);
            const remainingWeight = Number(intake.remainingWeight || 0);

            let newNormalizedWeight = 0;

            if (intake.status === "PENDING") {
              // Completely unsold: Recalculate full weight
              newNormalizedWeight = grossWeight * newConversion;
            } else if (intake.status === "PARTIAL") {
              // Partially sold:
              // Sold portion quantity in BAG:
              const soldBags = Math.max(0, grossWeight - remainingWeight);
              // Sold weight in KG is frozen at old conversion:
              const soldWeightKg = soldBags * oldConversion;
              // Unsold weight in KG is recalculated using new conversion:
              const unsoldWeightKg = remainingWeight * newConversion;
              
              newNormalizedWeight = soldWeightKg + unsoldWeightKg;
            }

            await tx.intakeTransaction.update({
              where: { id: intake.id },
              data: {
                normalizedWeight: newNormalizedWeight
              }
            });
          }
        }

        // Recalculate stock
        const { InventoryService } = require("./InventoryService");
        await InventoryService.recalculateProductStock(productId, tx);
      }

      return updatedProduct;
    });

    await emitActivity({
      entityType: "PRODUCT",
      entityId: product.id,
      action: "UPDATED",
      description: `Product "${product.name}" updated`,
      meta: { name: product.name, category: product.category, primaryUnit: product.primaryUnit }
    });

    return ProductRepository.serializeProduct(product);
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
