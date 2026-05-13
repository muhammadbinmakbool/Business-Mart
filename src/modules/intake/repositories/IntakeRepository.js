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
        advances: true
      }
    });
  }

  static async create(data) {
    const nextNumber = await this.getNextIntakeNumber();
    return prisma.intakeTransaction.create({
      data: {
        ...data,
        intakeNumber: nextNumber
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

  static async getNextIntakeNumber() {
    const lastEntry = await prisma.intakeTransaction.findFirst({
      orderBy: { id: "desc" }
    });

    const nextId = lastEntry ? lastEntry.id + 1 : 1;
    return `INT-${nextId.toString().padStart(6, "0")}`;
  }
}
