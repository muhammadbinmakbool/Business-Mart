import { PrismaClient } from "../../prisma/client";
import { getProvider } from "./database/provider";
import { ApplicationLogger } from "./logger";
import "./database/shutdownManager"; // Register shutdown listeners

const globalForPrisma = global;

const provider = getProvider();
console.log(`[Prisma] Active database provider resolved as: ${provider}`);

const prismaOptions = {
  log: [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" }
  ]
};
if (process.env.PRISMA_LOG_QUERIES === "true") {
  prismaOptions.log.push({ emit: "stdout", level: "query" });
}

export const prisma =
  globalForPrisma.prisma ||
  (() => {
    const client = new PrismaClient(prismaOptions);
    client.$on("error", (e) => {
      ApplicationLogger.error(e.message, { target: "prisma", error: e });
    });
    client.$on("warn", (e) => {
      ApplicationLogger.warn(e.message, { target: "prisma" });
    });
    return client;
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
