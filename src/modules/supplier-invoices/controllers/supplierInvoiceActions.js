"use server";

import { revalidatePath } from "next/cache";
import { SupplierInvoiceService } from "../services/SupplierInvoiceService";
import { SupplierInvoiceRepository } from "../repositories/SupplierInvoiceRepository";
import { emitActivity } from "@/modules/activity-log/activityLogger";
import { calculateInvoiceClearingState } from "@/lib/financial";
import { invalidateCacheBucket } from "@/modules/aggregations/cache";
import { ApplicationLogger } from "@/lib/logger";

function safeRevalidatePath(path) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Suppress static generation store missing error in CLI/E2E test runs!
  }
}

function invalidateSupplierCache() {
  invalidateCacheBucket("dashboard");
  invalidateCacheBucket("ledger");
  invalidateCacheBucket("supplier");
}

export async function generateSupplierInvoiceAction(formData) {
  try {
    const partyId = formData.get("partyId");
    const intakeIds = JSON.parse(formData.get("intakeIds") || "[]");
    const advanceIds = JSON.parse(formData.get("advanceIds") || "[]");
    const adjustmentsByIntake = JSON.parse(formData.get("adjustmentsByIntake") || "{}");
    const entryDate = formData.get("entryDate");

    const invoice = await SupplierInvoiceService.generateInvoice(partyId, intakeIds, advanceIds, adjustmentsByIntake, entryDate);
    
    safeRevalidatePath("/supplier-invoices");
    invalidateSupplierCache();
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error) {
    ApplicationLogger.error("Failed to generate supplier invoice", error);
    return { success: false, error: error.message };
  }
}

export async function regenerateSupplierInvoiceAction(invoiceId, adjustmentsByIntake = null) {
  try {
    const newInvoice = await SupplierInvoiceService.regenerateInvoice(invoiceId, adjustmentsByIntake);
    safeRevalidatePath(`/supplier-invoices/${invoiceId}`);
    safeRevalidatePath("/supplier-invoices");
    invalidateSupplierCache();
    return { success: true, data: JSON.parse(JSON.stringify(newInvoice)) };
  } catch (error) {
    ApplicationLogger.error("Failed to regenerate supplier invoice", error);
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

export async function listSupplierInvoicesPaginatedAction({
  page = 1,
  limit = 50,
  searchQuery = "",
  status = "ALL",
  dateRange = null,
  sortField = "entryDate",
  sortDirection = "desc"
} = {}) {
  try {
    const { clampLimit } = await import("@/lib/pagination");
    const clampedLimit = clampLimit(limit);

    const { items, totalCount } = await SupplierInvoiceRepository.getAllPaginated({
      page,
      limit: clampedLimit,
      searchQuery,
      status,
      dateRange,
      sortField,
      sortDirection
    });

    const tabCounts = await SupplierInvoiceRepository.getTabCounts({ searchQuery, dateRange });

    return {
      success: true,
      data: {
        items: JSON.parse(JSON.stringify(items)),
        totalCount,
        tabCounts
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateInvoiceStatusAction(id, status, notes) {
  try {
    const { prisma } = await import("@/lib/prisma");

    const currentInvoice = await prisma.supplierInvoice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentInvoice) {
      throw new Error("Invoice not found");
    }

    if (status === "CANCELLED" && currentInvoice.status !== "CANCELLED") {
      const { SupplierWorkflowEngine } = await import("@/modules/supplier-invoices/workflow/SupplierWorkflowEngine");
      const allowedActions = await SupplierWorkflowEngine.getAllowedActions(currentInvoice);
      if (!allowedActions.state.canCancel) {
        throw new Error("Cannot cancel this supplier invoice.");
      }
      await SupplierWorkflowEngine.validateCancellation(notes);
    }

    let paidAmount = 0;
    if (status === "CLEARED") {
      paidAmount = Number(currentInvoice.finalPayableAmount);
    }

    const clearingState = calculateInvoiceClearingState(currentInvoice.finalPayableAmount, paidAmount);
    const paymentStatus = clearingState.paymentStatus;

    const invoice = await prisma.supplierInvoice.update({
      where: { id: parseInt(id) },
      data: {
        status,
        paidAmount,
        paymentStatus,
        notes: (status === "CANCELLED" && notes)
          ? (currentInvoice.notes ? `${currentInvoice.notes} | Cancellation Reason: ${notes}` : `Cancellation Reason: ${notes}`)
          : currentInvoice.notes
      }
    });

    let action = "UPDATED";
    if (status === "CLEARED") action = "CLEARED";

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

    safeRevalidatePath(`/supplier-invoices/${id}`);
    safeRevalidatePath("/supplier-invoices");
    invalidateSupplierCache();
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getUninvoicedDataAction(partyId) {
  try {
    const { getUninvoicedSupplierData } = await import("@/modules/aggregations/supplierAggregator");
    const data = await getUninvoicedSupplierData(partyId);
    return { 
      success: true, 
      data 
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
    const entryDate = formData.get("entryDate");

    const newInvoice = await SupplierInvoiceService.editInvoice(invoiceId, intakeIds, advanceIds, adjustmentsByIntake, entryDate);
    
    safeRevalidatePath(`/supplier-invoices/${invoiceId}`);
    safeRevalidatePath("/supplier-invoices");
    invalidateSupplierCache();
    return { success: true, data: JSON.parse(JSON.stringify(newInvoice)) };
  } catch (error) {
    ApplicationLogger.error("Failed to edit supplier invoice", error);
    return { success: false, error: error.message };
  }
}

import { assertDeletePermission } from "@/lib/authGuard";

export async function deleteSupplierInvoiceAction(invoiceId, confirmPassword, deleteReason) {
  try {
    // Enforce unified record deletion permission and password confirmation check
    await assertDeletePermission(confirmPassword);

    await SupplierInvoiceService.deleteInvoice(invoiceId, deleteReason);
    safeRevalidatePath("/supplier-invoices");
    invalidateSupplierCache();
    return { success: true };
  } catch (error) {
    ApplicationLogger.error("Failed to delete supplier invoice", error);
    return { success: false, error: error.message };
  }
}

export async function hardDeleteSupplierInvoiceAction(invoiceId, deleteReason) {
  try {
    // assertDestructiveMode is called inside SupplierInvoiceRepository.hardDelete
    await SupplierInvoiceService.hardDeleteInvoice(invoiceId, deleteReason);
    safeRevalidatePath("/supplier-invoices");
    invalidateSupplierCache();
    return { success: true };
  } catch (error) {
    ApplicationLogger.error("Failed to permanently delete supplier invoice", error);
    return { success: false, error: error.message };
  }
}

export async function recordSupplierPaymentAction(id, amount) {
  try {
    const invoice = await SupplierInvoiceService.recordPayment(id, amount);
    safeRevalidatePath(`/supplier-invoices/${id}`);
    safeRevalidatePath("/supplier-invoices");
    invalidateSupplierCache();
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
