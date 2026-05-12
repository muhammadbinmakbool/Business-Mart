import { prisma } from "@/lib/prisma";

export class PartyRepository {
  static async getAll() {
    return prisma.party.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async getById(id) {
    return prisma.party.findUnique({
      where: { id: parseInt(id) },
    });
  }

  static async create(data) {
    return prisma.party.create({
      data,
    });
  }

  static async update(id, data) {
    return prisma.party.update({
      where: { id: parseInt(id) },
      data,
    });
  }

  static async toggleStatus(id, isActive) {
    return prisma.party.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });
  }
}
