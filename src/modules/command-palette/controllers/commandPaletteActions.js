"use server";

import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import { SaleService } from "@/modules/sales/services/SaleService";
import { IntakeService } from "@/modules/intake/services/IntakeService";

export async function getCommandPaletteDataAction() {
  try {
    const parties = await PartyService.listParties();
    const products = await ProductService.listProducts();
    const sales = await SaleService.listSales();
    const intakes = await IntakeService.listIntakes();

    const formattedParties = parties
      .filter(p => p.isActive)
      .map(p => ({
        id: `party-${p.id}`,
        title: `${p.name} (${p.partyType})`,
        subtitle: p.phoneNumber ? `Phone: ${p.phoneNumber}` : "No phone number",
        type: "party",
        keywords: [p.name, p.phoneNumber, p.partyType].filter(Boolean),
        url: `/parties/${p.id}`
      }));

    const formattedProducts = products
      .filter(p => p.isActive)
      .map(p => ({
        id: `product-${p.id}`,
        title: p.name,
        subtitle: `Category: ${p.category} | Unit: ${p.primaryUnit}`,
        type: "product",
        keywords: [p.name, p.category, p.primaryUnit].filter(Boolean),
        url: `/products/${p.id}/edit`
      }));

    // Last 50 sales
    const formattedSales = sales
      .slice(-50)
      .map(s => ({
        id: `sale-${s.id}`,
        title: `Sale: ${s.saleNumber}`,
        subtitle: `Buyer: ${s.party?.name || "N/A"} | Notes: ${s.notes || ""}`,
        type: "sale",
        keywords: [s.saleNumber, s.party?.name, s.notes].filter(Boolean),
        url: `/sales/${s.id}`
      }))
      .reverse();

    // Last 50 intakes
    const formattedIntakes = intakes
      .slice(-50)
      .map(i => ({
        id: `intake-${i.id}`,
        title: `Intake: ${i.intakeNumber}`,
        subtitle: `Supplier: ${i.party?.name || "N/A"} | Notes: ${i.notes || ""}`,
        type: "intake",
        keywords: [i.intakeNumber, i.party?.name, i.notes].filter(Boolean),
        url: `/intake/${i.id}`
      }))
      .reverse();

    return {
      parties: formattedParties,
      products: formattedProducts,
      sales: formattedSales,
      intakes: formattedIntakes
    };
  } catch (error) {
    console.error("Failed to load command palette data:", error);
    return { parties: [], products: [], sales: [], intakes: [] };
  }
}
