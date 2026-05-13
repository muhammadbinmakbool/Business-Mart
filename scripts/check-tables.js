const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Checking database tables...");
    // Query sys.tables in MSSQL
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sys.tables`);
    console.log("Tables found:", tables.map(t => t.name).join(", "));
  } catch (error) {
    console.error("Error checking tables:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
