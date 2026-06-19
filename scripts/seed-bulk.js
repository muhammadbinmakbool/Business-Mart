const { PrismaClient } = require("../prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Bulk Seeding of 1000 products, 1000 parties, 10000 intakes, 10000 supplier settlements, and 10000 sales invoices...");
  const startTime = Date.now();

  // 1. Get current Max IDs
  const lastProduct = await prisma.product.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const maxProductId = lastProduct ? lastProduct.id : 0;

  const lastParty = await prisma.party.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const maxPartyId = lastParty ? lastParty.id : 0;

  const lastIntake = await prisma.intakeTransaction.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const maxIntakeId = lastIntake ? lastIntake.id : 0;

  const lastSale = await prisma.saleTransaction.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const maxSaleId = lastSale ? lastSale.id : 0;

  const lastSaleItem = await prisma.saleItem.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const maxSaleItemId = lastSaleItem ? lastSaleItem.id : 0;

  const lastInvoice = await prisma.supplierInvoice.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const maxInvoiceId = lastInvoice ? lastInvoice.id : 0;

  console.log(`Current base database state:`);
  console.log(`- Max Product ID: ${maxProductId}`);
  console.log(`- Max Party ID: ${maxPartyId}`);
  console.log(`- Max Intake ID: ${maxIntakeId}`);
  console.log(`- Max Sale ID: ${maxSaleId}`);
  console.log(`- Max SaleItem ID: ${maxSaleItemId}`);
  console.log(`- Max SupplierInvoice ID: ${maxInvoiceId}`);

  // 2. Generate Products
  const products = [];
  for (let i = 1; i <= 1000; i++) {
    products.push({
      id: maxProductId + i,
      name: `Seed Product ${i}`,
      category: "WEIGHT",
      unitCategory: "WEIGHT",
      primaryUnit: "KG",
      defaultSellingUnit: "KG",
      buyingRateUnit: "KG",
      sellingRateUnit: "KG",
      isActive: true,
      isDeleted: false,
      userId: 0,
      businessId: 0
    });
  }

  // 3. Generate Parties (500 Suppliers, 500 Buyers)
  const parties = [];
  const suppliers = [];
  const buyers = [];

  for (let i = 1; i <= 500; i++) {
    const sName = `Seed Supplier ${i}`;
    const sPhone = `0300${Math.floor(1000000 + Math.random() * 9000000)}`;
    const sCity = ["Lahore", "Karachi", "Faisalabad", "Multan", "Kasur"][i % 5];
    const supplierId = maxPartyId + i;
    parties.push({
      id: supplierId,
      name: sName,
      phoneNumber: sPhone,
      address: `${sCity} Galla Mandi`,
      partyType: "SUPPLIER",
      isActive: true,
      isDeleted: false,
      userId: 0,
      businessId: 0
    });
    suppliers.push(supplierId);
  }

  for (let i = 1; i <= 500; i++) {
    const bName = `Seed Buyer ${i}`;
    const bPhone = `0321${Math.floor(1000000 + Math.random() * 9000000)}`;
    const bCity = ["Lahore", "Karachi", "Faisalabad", "Multan", "Kasur"][i % 5];
    const buyerId = maxPartyId + 500 + i;
    parties.push({
      id: buyerId,
      name: bName,
      phoneNumber: bPhone,
      address: `${bCity} Market`,
      partyType: "BUYER",
      isActive: true,
      isDeleted: false,
      userId: 0,
      businessId: 0
    });
    buyers.push(buyerId);
  }

  console.log("Saving Products...");
  for (let i = 0; i < products.length; i += 500) {
    await prisma.product.createMany({ data: products.slice(i, i + 500) });
  }

  console.log("Saving Parties...");
  for (let i = 0; i < parties.length; i += 500) {
    await prisma.party.createMany({ data: parties.slice(i, i + 500) });
  }

  // 4. Generate Transactions: Intakes, Invoices, Sales, SaleItems, SalesTracks, SupplierInvoiceItems
  const intakes = [];
  const sales = [];
  const saleItems = [];
  const salesTracks = [];
  const supplierInvoices = [];
  const supplierInvoiceItems = [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14); // Exactly 14 days ago

  for (let i = 0; i < 10000; i++) {
    // Distribute entryDate across the last 14 days uniformly
    const entryDate = new Date(startDate.getTime() + (i / 10000) * 14 * 24 * 60 * 60 * 1000);

    const supplierId = suppliers[i % suppliers.length];
    const buyerId = buyers[i % buyers.length];
    const productId = maxProductId + 1 + (i % 1000); // Distributed across the 1000 seed products

    const weight = 500 + (i % 4501); // 500 to 5000 kg
    const rate = 60 + (i % 61); // 60 to 120 Rs/kg
    const sellingRate = rate + 5 + (i % 11); // profit of 5 to 15 Rs/kg
    const intakeAmount = weight * rate;
    const saleAmount = weight * sellingRate;

    const intakeId = maxIntakeId + 1 + i;
    const saleId = maxSaleId + 1 + i;
    const saleItemId = maxSaleItemId + 1 + i;
    const invoiceId = maxInvoiceId + 1 + i;

    const suffix = `${i.toString().padStart(6, '0')}`;

    // A. Intake Transaction
    intakes.push({
      id: intakeId,
      intakeNumber: `INT-BULK-${suffix}`,
      entryDate,
      partyId: supplierId,
      productId: productId,
      bagCount: Math.ceil(weight / 50),
      rate: rate.toFixed(2),
      rateUnit: "KG",
      grossWeight: weight.toFixed(2),
      unit: "KG",
      normalizedWeight: weight.toFixed(2),
      netWeight: weight.toFixed(2),
      remainingWeight: "0.00",
      status: "SOLD",
      isDeleted: false,
      userId: 0,
      businessId: 0
    });

    // B. Sales Invoice (SaleTransaction)
    sales.push({
      id: saleId,
      saleNumber: `SAL-BULK-${suffix}`,
      entryDate,
      partyId: buyerId,
      totalWeight: weight.toFixed(2),
      baseAmount: saleAmount.toFixed(2),
      totalAdjustments: "0.00",
      finalAmount: saleAmount.toFixed(2),
      status: "CLEARED",
      paidAmount: saleAmount.toFixed(2),
      paymentStatus: "CLEARED",
      isDeleted: false,
      userId: 0,
      businessId: 0
    });

    // C. Sale Item
    saleItems.push({
      id: saleItemId,
      saleId: saleId,
      productId: productId,
      weight: weight.toFixed(2),
      unit: "KG",
      normalizedWeight: weight.toFixed(2),
      rate: sellingRate.toFixed(2),
      amount: saleAmount.toFixed(2),
      userId: 0,
      businessId: 0
    });

    // D. Sales Track (for intake linked sales / source tracking)
    salesTracks.push({
      saleTransactionId: saleId,
      saleItemId: saleItemId,
      intakeTransactionId: intakeId,
      type: "INTAKE_SALE",
      supplierPartyId: supplierId,
      buyerPartyId: buyerId,
      productId: productId,
      quantity: weight.toFixed(2),
      buyingRate: rate.toFixed(2),
      sellingRate: sellingRate.toFixed(2),
      rateUnit: "KG",
      netWeight: weight.toFixed(2),
      baseAmount: intakeAmount.toFixed(2),
      isBilled: true,
      isSettled: true,
      isDeleted: false,
      userId: 0,
      businessId: 0
    });

    // E. Supplier Invoice (Supplier Settlement)
    supplierInvoices.push({
      id: invoiceId,
      invoiceNumber: `SUP-BULK-${suffix}`,
      partyId: supplierId,
      entryDate,
      totalGrossValue: intakeAmount.toFixed(2),
      totalDeductions: "0.00",
      totalAdvances: "0.00",
      finalPayableAmount: intakeAmount.toFixed(2),
      status: "CLEARED",
      paidAmount: intakeAmount.toFixed(2),
      paymentStatus: "CLEARED",
      isDeleted: false,
      userId: 0,
      businessId: 0
    });

    // F. Supplier Invoice Item
    supplierInvoiceItems.push({
      supplierInvoiceId: invoiceId,
      intakeTransactionId: intakeId,
      weight: weight.toFixed(2),
      rate: rate.toFixed(2),
      amount: intakeAmount.toFixed(2),
      userId: 0,
      businessId: 0
    });
  }

  console.log("Saving Intakes...");
  for (let i = 0; i < intakes.length; i += 1000) {
    await prisma.intakeTransaction.createMany({ data: intakes.slice(i, i + 1000) });
  }

  console.log("Saving Sales Invoices...");
  for (let i = 0; i < sales.length; i += 1000) {
    await prisma.saleTransaction.createMany({ data: sales.slice(i, i + 1000) });
  }

  console.log("Saving Sale Items...");
  for (let i = 0; i < saleItems.length; i += 1000) {
    await prisma.saleItem.createMany({ data: saleItems.slice(i, i + 1000) });
  }

  console.log("Saving Sales Tracks...");
  for (let i = 0; i < salesTracks.length; i += 1000) {
    await prisma.salesTrack.createMany({ data: salesTracks.slice(i, i + 1000) });
  }

  console.log("Saving Supplier Settlements...");
  for (let i = 0; i < supplierInvoices.length; i += 1000) {
    await prisma.supplierInvoice.createMany({ data: supplierInvoices.slice(i, i + 1000) });
  }

  console.log("Saving Supplier Invoice Items...");
  for (let i = 0; i < supplierInvoiceItems.length; i += 1000) {
    await prisma.supplierInvoiceItem.createMany({ data: supplierInvoiceItems.slice(i, i + 1000) });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Bulk seeding of 1000 products, 1000 parties, and 10000 transaction cycles completed successfully in ${duration}s!`);
}

main()
  .catch((e) => {
    console.error("❌ Bulk seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
