import { PrismaClient } from "../../prisma/client";
import { getProvider } from "./database/provider";
import "./database/shutdownManager"; // Register shutdown listeners

const globalForPrisma = global;

const provider = getProvider();
console.log(`[Prisma] Active database provider resolved as: ${provider}`);

const prismaOptions = {
  log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query", "error", "warn"] : ["error", "warn"],
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
