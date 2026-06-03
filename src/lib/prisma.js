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

if (typeof window === "undefined" && !globalForPrisma.prismaGracefulRegistered) {
  globalForPrisma.prismaGracefulRegistered = true;

  const gracefulShutdown = async () => {
    console.log("[Prisma] SIGTERM/SIGINT received. Initiating graceful database shutdown...");
    try {
      if (isSQLite()) {
        console.log("[Prisma] Running SQLite WAL checkpoint (TRUNCATE)...");
        await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
        console.log("[Prisma] SQLite WAL checkpoint completed.");
      }
      await prisma.$disconnect();
      console.log("[Prisma] Prisma Client disconnected cleanly.");
    } catch (err) {
      console.error("[Prisma] Error during database shutdown:", err);
    }
  };

  process.once("SIGTERM", gracefulShutdown);
  process.once("SIGINT", gracefulShutdown);
}

export default prisma;
