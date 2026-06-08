import { prisma } from "@/lib/prisma";

export class ActivityLogRepository {
  static serializeLog(log) {
    if (!log) return null;
    return {
      ...log,
      meta: log.meta ? JSON.parse(log.meta) : null
    };
  }

  static async create(data) {
    const serializedData = {
      ...data,
      meta: data.meta ? JSON.stringify(data.meta) : null
    };
    const log = await prisma.activityLog.create({
      data: serializedData
    });
    return this.serializeLog(log);
  }

  static async getPaged({ entityType, action, entityId, startDate, endDate, skip = 0, take = 50 }) {
    const where = {};
    if (entityType) {
      where.entityType = entityType;
    }
    if (action) {
      where.action = action;
    }
    if (entityId !== undefined && entityId !== null && entityId !== "") {
      where.entityId = parseInt(entityId);
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDate = new Date(endDate);
        endOfDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: parseInt(skip),
        take: parseInt(take),
      }),
      prisma.activityLog.count({ where })
    ]);

    return {
      logs: logs.map(log => this.serializeLog(log)),
      total
    };
  }
}
