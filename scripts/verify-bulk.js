const { PrismaClient } = require("../prisma/client");
const prisma = new PrismaClient();

async function main() {
  const pCount = await prisma.product.count({ where: { name: { startsWith: "Seed Product" } } });
  const partyCount = await prisma.party.count({ where: { name: { startsWith: "Seed" } } });
  const iCount = await prisma.intakeTransaction.count({ where: { intakeNumber: { startsWith: "INT-BULK" } } });
  const sCount = await prisma.supplierInvoice.count({ where: { invoiceNumber: { startsWith: "SUP-BULK" } } });
  const saleCount = await prisma.saleTransaction.count({ where: { saleNumber: { startsWith: "SAL-BULK" } } });

  console.log("Verification results:");
  console.log(`- Seed Products count: ${pCount}`);
  console.log(`- Seed Parties count: ${partyCount}`);
  console.log(`- Seed Intakes count: ${iCount}`);
  console.log(`- Seed Supplier Invoices (Settlements) count: ${sCount}`);
  console.log(`- Seed Sales Invoices count: ${saleCount}`);

  // Check some details to confirm status and paymentStatus
  const firstIntake = await prisma.intakeTransaction.findFirst({ where: { intakeNumber: "INT-BULK-000000" } });
  console.log(`First Intake status: ${firstIntake.status}, remainingWeight: ${firstIntake.remainingWeight}`);

  const firstSupplierInvoice = await prisma.supplierInvoice.findFirst({ where: { invoiceNumber: "SUP-BULK-000000" } });
  console.log(`First Supplier Invoice status: ${firstSupplierInvoice.status}, paymentStatus: ${firstSupplierInvoice.paymentStatus}, paidAmount: ${firstSupplierInvoice.paidAmount}, finalPayableAmount: ${firstSupplierInvoice.finalPayableAmount}`);

  const firstSaleInvoice = await prisma.saleTransaction.findFirst({ where: { saleNumber: "SAL-BULK-000000" } });
  console.log(`First Sale Invoice status: ${firstSaleInvoice.status}, paymentStatus: ${firstSaleInvoice.paymentStatus}, paidAmount: ${firstSaleInvoice.paidAmount}, finalAmount: ${firstSaleInvoice.finalAmount}`);
}

main().finally(() => prisma.$disconnect());
