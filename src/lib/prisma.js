import { PrismaClient } from "../../prisma/client";
import { getProvider } from "./database/provider";

const globalForPrisma = global;

const provider = getProvider();
console.log(`[Prisma] Active database provider resolved as: ${provider}`);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
