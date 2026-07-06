import { prisma } from "../prisma";
import { isSQLite } from "./provider";
import { ApplicationLogger } from "../logger";

if (typeof window === "undefined") {
  const gracefulShutdown = async (signal) => {
    console.log(`[ShutdownManager] Received ${signal}. Initiating database cleanup...`);
    
    // Safety watchdog: if teardown hangs, force exit as a last resort
    const watchdog = setTimeout(() => {
      console.warn("[ShutdownManager] Cleanup timed out after 10s. Forcing exit...");
      process.exit(1);
    }, 10000);
    
    // Prevent timer from keeping event loop active
    watchdog.unref();

    try {
      if (isSQLite()) {
        console.log("[ShutdownManager] Merging SQLite WAL pages via TRUNCATE...");
        try {
          await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
          console.log("[ShutdownManager] WAL checkpoint completed successfully.");
        } catch (err) {
          ApplicationLogger.error("[ShutdownManager] SQLite WAL checkpoint failed", err);
        }
      }

      console.log("[ShutdownManager] Disconnecting Prisma Client...");
      try {
        await prisma.$disconnect();
        console.log("[ShutdownManager] Prisma client disconnected cleanly.");
      } catch (err) {
        ApplicationLogger.error("[ShutdownManager] Prisma disconnect failed", err);
      }
    } catch (err) {
      ApplicationLogger.error("[ShutdownManager] Error during shutdown routine", err);
    } finally {
      clearTimeout(watchdog);
      console.log("[ShutdownManager] Database teardown completed. Releasing process control.");
      // We do NOT call process.exit(0) here. 
      // Next.js will terminate naturally as the connection drains and event loop clears.
    }
  };

  process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.once("SIGINT", () => gracefulShutdown("SIGINT"));
}
