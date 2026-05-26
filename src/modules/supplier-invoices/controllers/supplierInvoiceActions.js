"use server";

import { revalidatePath } from "next/cache";
import { SupplierInvoiceService } from "../services/SupplierInvoiceService";
import { SupplierInvoiceRepository } from "../repositories/SupplierInvoiceRepository";
import { emitActivity } from "@/modules/activity-log/activityLogger";

export async function generateSupplierInvoiceAction(formData) {
  try {
    const partyId = formData.get("partyId");
    const intakeIds = JSON.parse(formData.get("intakeIds") || "[]");
    const advanceIds = JSON.parse(formData.get("advanceIds") || "[]");
    const adjustmentsByIntake = JSON.parse(formData.get("adjustmentsByIntake") || "{}");

    const invoice = await SupplierInvoiceService.generateInvoice(partyId, intakeIds, advanceIds, adjustmentsByIntake);
    
    revalidatePath("/supplier-invoices");
    return { success: true, data: invoice };
  } catch (error) {
    console.error("Failed to generate supplier invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function regenerateSupplierInvoiceAction(invoiceId, adjustmentsByIntake = null) {
  try {
    const newInvoice = await SupplierInvoiceService.regenerateInvoice(invoiceId, adjustmentsByIntake);
    revalidatePath(`/supplier-invoices/${invoiceId}`);
    revalidatePath("/supplier-invoices");
    return { success: true, data: JSON.parse(JSON.stringify(newInvoice)) };
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
    
    // Unify status update with allocation layer payments
    const { PartySettlementService } = await import("@/modules/parties/services/PartySettlementService");
    const { prisma } = await import("@/lib/prisma");

    if (status === "COMPLETED") {
      // Look for existing direct payment
      const existingPay = await prisma.partyPayment.findFirst({
        where: {
          directReferenceType: "SETTLEMENT",
          directReferenceId: invoice.id
        }
      });
      if (!existingPay) {
        await PartySettlementService.recordPayment({
          partyId: invoice.partyId,
          paymentType: "CASH_OUT",
          amount: Number(invoice.finalPayableAmount),
          notes: `Auto-recorded payment upon marking Invoice #${invoice.invoiceNumber} as Paid`,
          paymentMethod: "CASH",
          directReferenceType: "SETTLEMENT",
          directReferenceId: invoice.id
        });
      }
    } else if (status === "PENDING") {
      // Reverting to pending, find and remove payment if it exists
      const existingPay = await prisma.partyPayment.findFirst({
        where: {
          directReferenceType: "SETTLEMENT",
          directReferenceId: invoice.id
        }
      });
      if (existingPay) {
        await PartySettlementService.deletePayment(existingPay.id);
      }
    }

    let action = "UPDATED";
    if (status === "COMPLETED") action = "COMPLETED";

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: invoice.id,
      action,
      description: `Supplier invoice ${invoice.invoiceNumber} status updated to ${status}`,
      meta: {
        supplierId: invoice.partyId,
        status: invoice.status,
        finalPayableAmount: Number(invoice.finalPayableAmount)
      }
    });

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

export async function editSupplierInvoiceAction(formData) {
  try {
    const invoiceId = parseInt(formData.get("invoiceId"));
    const intakeIds = JSON.parse(formData.get("intakeIds") || "[]");
    const advanceIds = JSON.parse(formData.get("advanceIds") || "[]");
    const adjustmentsByIntake = JSON.parse(formData.get("adjustmentsByIntake") || "{}");

    const newInvoice = await SupplierInvoiceService.editInvoice(invoiceId, intakeIds, advanceIds, adjustmentsByIntake);
    
    revalidatePath(`/supplier-invoices/${invoiceId}`);
    revalidatePath("/supplier-invoices");
    return { success: true, data: newInvoice };
  } catch (error) {
    console.error("Failed to edit supplier invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSupplierInvoiceAction(invoiceId) {
  try {
    await SupplierInvoiceService.deleteInvoice(invoiceId);
    revalidatePath("/supplier-invoices");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete supplier invoice:", error);
    return { success: false, error: error.message };
  }
}
