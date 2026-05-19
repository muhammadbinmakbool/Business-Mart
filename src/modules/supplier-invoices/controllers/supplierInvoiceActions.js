"use server";

import { revalidatePath } from "next/cache";
import { SupplierInvoiceService } from "../services/SupplierInvoiceService";
import { SupplierInvoiceRepository } from "../repositories/SupplierInvoiceRepository";

export async function generateSupplierInvoiceAction(formData) {
  try {
    const partyId = formData.get("partyId");
    const intakeIds = JSON.parse(formData.get("intakeIds") || "[]");
    const advanceIds = JSON.parse(formData.get("advanceIds") || "[]");
    const adjustments = JSON.parse(formData.get("adjustments") || "[]");

    const invoice = await SupplierInvoiceService.generateInvoice(partyId, intakeIds, advanceIds, adjustments);
    
    revalidatePath("/supplier-invoices");
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Failed to generate supplier invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function regenerateSupplierInvoiceAction(invoiceId, adjustments = null) {
  try {
    const newInvoice = await SupplierInvoiceService.regenerateInvoice(invoiceId, adjustments);
    revalidatePath(`/supplier-invoices/${invoiceId}`);
    revalidatePath("/supplier-invoices");
    return { success: true, data: newInvoice };
  } catch (error) {
    console.error("Failed to regenerate supplier invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function getSupplierInvoiceAction(id) {
  try {
    const invoice = await SupplierInvoiceRepository.getById(id);
    if (!invoice) return { success: false, error: "Invoice not found" };
    
    // Auto-check staleness on view
    await SupplierInvoiceRepository.checkStaleness(id);
    
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function listSupplierInvoicesAction() {
  try {
    const invoices = await SupplierInvoiceRepository.getAll();
    return { success: true, data: JSON.parse(JSON.stringify(invoices)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateInvoiceStatusAction(id, status) {
  try {
    const invoice = await SupplierInvoiceRepository.updateStatus(id, status);
    revalidatePath(`/supplier-invoices/${id}`);
    revalidatePath("/supplier-invoices");
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getUninvoicedDataAction(partyId) {
  try {
    const { IntakeService } = await import("@/modules/intake/services/IntakeService");
    const { AdvanceRepository } = await import("@/modules/intake/repositories/AdvanceRepository");
    
    const [intakes, advances] = await Promise.all([
      IntakeService.listUninvoicedIntakes(partyId),
      AdvanceRepository.getUnlinkedByPartyId(partyId)
    ]);
    
    return { 
      success: true, 
      data: { 
        intakes: JSON.parse(JSON.stringify(intakes)), 
        advances: JSON.parse(JSON.stringify(advances)) 
      } 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
