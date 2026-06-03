import { PrismaClient } from "../../prisma/client";
import { getProvider, isSQLite } from "./database/provider";

const globalForPrisma = global;

const provider = getProvider();
console.log(`[Prisma] Active database provider resolved as: ${provider}`);

const prismaOptions = {
  log: ["query"],
};

if (isSQLite()) {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith("file:")) {
    dbUrl = "file:./prisma/business_mart.db";
  }
  prismaOptions.datasources = {
    db: {
      url: dbUrl,
    },
  };
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
