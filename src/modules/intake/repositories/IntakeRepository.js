import { prisma } from "@/lib/prisma";

export class IntakeRepository {
  static async getAll() {
    return prisma.intakeTransaction.findMany({
      include: {
        party: true,
        product: true,
        _count: {
          select: { advances: true }
        }
      },
      orderBy: { id: "desc" },
    });
  }

  static async getById(id) {
    return prisma.intakeTransaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        party: true,
        product: true,
        advances: true,
        invoiceItems: {
          include: {
            invoice: true
          }
        },
        salesTracks: {
          include: {
            buyer: true
          }
        }
      }
    });
  }


  static async create(data) {
    const { partyId, productId, ...rest } = data;
    const nextNumber = await this.getNextIntakeNumber();
    
    return prisma.intakeTransaction.create({
      data: {
        ...rest,
        rate: data.rate ?? null,
        intakeNumber: nextNumber,
        party: { connect: { id: parseInt(partyId) } },
        product: { connect: { id: parseInt(productId) } }
      }
    });
  }

  static async update(id, data) {
    return prisma.intakeTransaction.update({
      where: { id: parseInt(id) },
      data
    });
  }

  static async delete(id) {
    // Delete linked advances first
    await prisma.intakeAdvance.deleteMany({
      where: { intakeTransactionId: parseInt(id) }
    });
    
    return prisma.intakeTransaction.delete({
      where: { id: parseInt(id) }
    });
  }

  static async getUninvoicedByPartyId(partyId) {
    return prisma.intakeTransaction.findMany({
      where: {
        partyId: parseInt(partyId),
        invoiceItems: { none: { invoice: { status: { not: "SUPERSEDED" } } } },
        status: "SOLD"
      },
      include: { product: true }
    });
  }

  static async getNextIntakeNumber() {
    const lastEntry = await prisma.intakeTransaction.findFirst({
      orderBy: { id: "desc" }
    });

    const nextId = lastEntry ? lastEntry.id + 1 : 1;
    return `INT-${nextId.toString().padStart(6, "0")}`;
  }
}
