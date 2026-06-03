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
    
    // 3-second safety watchdog to prevent process from hanging indefinitely
    const shutdownTimeout = setTimeout(() => {
      console.warn("[Prisma] Graceful shutdown timed out. Forcing process exit...");
      process.exit(0);
    }, 3000);
    
    shutdownTimeout.unref();

    try {
      if (isSQLite()) {
        console.log("[Prisma] Running SQLite WAL checkpoint (TRUNCATE)...");
        try {
          await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
          console.log("[Prisma] SQLite WAL checkpoint completed.");
        } catch (chkErr) {
          console.error("[Prisma] SQLite WAL checkpoint failed:", chkErr.message);
        }
      }
      
      console.log("[Prisma] Disconnecting Prisma Client...");
      try {
        await prisma.$disconnect();
        console.log("[Prisma] Prisma Client disconnected cleanly.");
      } catch (discErr) {
        console.error("[Prisma] Prisma disconnect failed:", discErr.message);
      }
    } catch (err) {
      console.error("[Prisma] Error during database shutdown sequence:", err.message);
    } finally {
      clearTimeout(shutdownTimeout);
      console.log("[Prisma] Graceful shutdown sequence finished. Exiting process.");
      process.exit(0);
    }
  };

  process.once("SIGTERM", gracefulShutdown);
  process.once("SIGINT", gracefulShutdown);
}

export default prisma;
