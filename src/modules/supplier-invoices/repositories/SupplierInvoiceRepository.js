import { prisma } from "@/lib/prisma";

export class SupplierInvoiceRepository {
  static async getNextInvoiceNumber() {
    const lastInvoice = await prisma.supplierInvoice.findFirst({
      orderBy: { id: "desc" },
      select: { id: true }
    });
    const nextId = (lastInvoice?.id || 0) + 1;
    return `SUP-${nextId.toString().padStart(6, "0")}`;
  }

  static async getAll() {
    return prisma.supplierInvoice.findMany({
      include: { party: true },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getByPartyId(partyId) {
    return prisma.supplierInvoice.findMany({
      where: { partyId: parseInt(partyId) },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getById(id) {
    return prisma.supplierInvoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        party: true,
        items: { 
          include: { 
            intake: { 
              include: { product: true } 
            },
            adjustments: true
          } 
        },
        advances: true
      }
    });
  }

  static async createWithItems(invoiceData, itemsData, advanceIds) {
    return prisma.$transaction(async (tx) => {
      return tx.supplierInvoice.create({
        data: {
          ...invoiceData,
          items: {
            create: itemsData.map(item => ({
              weight: item.weight,
              rate: item.rate,
              amount: item.amount,
              intake: { connect: { id: parseInt(item.intakeTransactionId) } },
              adjustments: {
                create: (item.adjustments || []).map(adj => ({
                  adjustmentType: adj.adjustmentType,
                  method: adj.method,
                  value: adj.value,
                  calculatedAmount: adj.calculatedAmount,
                  direction: adj.direction
                }))
              }
            }))
          },
          advances: {
            connect: advanceIds.map(id => ({ id: parseInt(id) }))
          }
        },
        include: {
          items: {
            include: {
              intake: { include: { product: true } },
              adjustments: true
            }
          },
          advances: true,
          party: true
        }
      });
    });
  }

  static async updateStatus(id, status, isOutdated = false) {
    return prisma.supplierInvoice.update({
      where: { id: parseInt(id) },
      data: { status, isOutdated }
    });
  }

  /**
   * Checks if an invoice is stale by comparing linked records' updatedAt with invoice.lastCalculatedAt.
   */
  static async checkStaleness(id) {
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id: parseInt(id) },
      include: { 
        items: { select: { intakeTransactionId: true } },
        advances: { select: { id: true } }
      }
    });

    if (!invoice || invoice.status === "SUPERSEDED") return false;

    const intakeIds = invoice.items.map(i => i.intakeTransactionId);
    const advanceIds = invoice.advances.map(a => a.id);

    const [maxIntakeUpdate, maxAdvanceUpdate] = await Promise.all([
      prisma.intakeTransaction.aggregate({
        where: { id: { in: intakeIds } },
        _max: { updatedAt: true }
      }),
      prisma.intakeAdvance.aggregate({
        where: { id: { in: advanceIds } },
        _max: { updatedAt: true }
      })
    ]);

    const latestIntakeUpdate = maxIntakeUpdate._max.updatedAt || new Date(0);
    const latestAdvanceUpdate = maxAdvanceUpdate._max.updatedAt || new Date(0);
    
    const stale = latestIntakeUpdate > invoice.lastCalculatedAt || latestAdvanceUpdate > invoice.lastCalculatedAt;
    
    if (stale && !invoice.isOutdated) {
      await prisma.supplierInvoice.update({
        where: { id: parseInt(id) },
        data: { isOutdated: true }
      });
      return true;
    }

    return stale;
  }
}
