import { prisma } from "@/lib/prisma";

export class SalesTrackService {
  /**
   * Returns all source tracking entries with related informational data.
   */
  static async list() {
    const tracks = await prisma.salesTrack.findMany({
      include: {
        saleTransaction: true,
        intakeTransaction: true,
        supplier: true,
        buyer: true,
        product: true
      },
      orderBy: { createdAt: "desc" }
    });
    return JSON.parse(JSON.stringify(tracks));
  }

  static async create(data) {
    return prisma.salesTrack.create({
      data: {
        saleTransactionId: data.saleTransactionId ? parseInt(data.saleTransactionId) : null,
        saleItemId: data.saleItemId ? parseInt(data.saleItemId) : null,
        intakeTransactionId: data.intakeTransactionId ? parseInt(data.intakeTransactionId) : null,
        supplierPartyId: data.supplierPartyId ? parseInt(data.supplierPartyId) : null,
        buyerPartyId: data.buyerPartyId ? parseInt(data.buyerPartyId) : null,
        productId: data.productId ? parseInt(data.productId) : null,
        quantity: data.quantity,
        buyingRate: data.buyingRate ? Number(data.buyingRate) : null,
        sellingRate: data.sellingRate ? Number(data.sellingRate) : null,
        netWeight: data.netWeight ? Number(data.netWeight) : null,
        initialTotal: data.initialTotal ? Number(data.initialTotal) : null,
        notes: data.notes
      }
    });
  }

  static async update(id, data) {
    return prisma.salesTrack.update({
      where: { id: parseInt(id) },
      data: {
        saleTransactionId: data.saleTransactionId ? parseInt(data.saleTransactionId) : null,
        saleItemId: data.saleItemId ? parseInt(data.saleItemId) : null,
        intakeTransactionId: data.intakeTransactionId ? parseInt(data.intakeTransactionId) : null,
        supplierPartyId: data.supplierPartyId ? parseInt(data.supplierPartyId) : null,
        buyerPartyId: data.buyerPartyId ? parseInt(data.buyerPartyId) : null,
        productId: data.productId ? parseInt(data.productId) : null,
        quantity: data.quantity,
        buyingRate: data.buyingRate ? Number(data.buyingRate) : null,
        sellingRate: data.sellingRate ? Number(data.sellingRate) : null,
        netWeight: data.netWeight ? Number(data.netWeight) : null,
        initialTotal: data.initialTotal ? Number(data.initialTotal) : null,
        notes: data.notes
      }
    });
  }

  static async delete(id) {
    return prisma.salesTrack.delete({
      where: { id: parseInt(id) }
    });
  }

  static async getById(id) {
    const track = await prisma.salesTrack.findUnique({
      where: { id: parseInt(id) },
      include: {
        saleTransaction: true,
        intakeTransaction: true,
        supplier: true,
        buyer: true,
        product: true
      }
    });
    return JSON.parse(JSON.stringify(track));
  }
}
