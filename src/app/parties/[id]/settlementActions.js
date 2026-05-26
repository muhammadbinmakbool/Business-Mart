"use server";

import { revalidatePath } from "next/cache";
import { PartySettlementService } from "@/modules/parties/services/PartySettlementService";

export async function recordPaymentAction({
  partyId,
  paymentType,
  amount,
  paymentMethod = "CASH",
  notes = null,
  entryDate = new Date()
}) {
  try {
    const payment = await PartySettlementService.recordPayment({
      partyId,
      paymentType,
      amount,
      paymentMethod,
      notes,
      entryDate
    });

    revalidatePath(`/parties/${partyId}`);
    revalidatePath("/parties");
    return { success: true, data: JSON.parse(JSON.stringify(payment)) };
  } catch (error) {
    console.error("Failed to record payment:", error);
    return { success: false, error: error.message };
  }
}

export async function deletePaymentAction(paymentId, partyId) {
  try {
    await PartySettlementService.deletePayment(paymentId);
    revalidatePath(`/parties/${partyId}`);
    revalidatePath("/parties");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete payment:", error);
    return { success: false, error: error.message };
  }
}

export async function clearInvoiceDirectlyAction({
  referenceType,
  referenceId,
  paymentMethod = "CASH",
  notes = null
}) {
  try {
    const payment = await PartySettlementService.clearInvoiceDirectly(
      referenceType,
      referenceId,
      paymentMethod,
      notes
    );

    revalidatePath(`/parties/${payment.partyId}`);
    revalidatePath("/parties");
    if (referenceType === "SETTLEMENT") {
      revalidatePath(`/supplier-invoices/${referenceId}`);
      revalidatePath("/supplier-invoices");
    }
    return { success: true, data: JSON.parse(JSON.stringify(payment)) };
  } catch (error) {
    console.error("Failed to clear invoice directly:", error);
    return { success: false, error: error.message };
  }
}
