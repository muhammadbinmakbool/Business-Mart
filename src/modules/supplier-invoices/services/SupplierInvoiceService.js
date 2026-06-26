import { SupplierInvoiceRepository } from "../repositories/SupplierInvoiceRepository";
import { calculateSupplierDeductions, calculateInvoiceClearingFromAllocations } from "@/lib/financial";
import { prisma } from "@/lib/prisma";
import { convertRate, DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { emitActivity, logSettlementEvent, logPaymentEvent } from "@/modules/activity-log/activityLogger";
import { withOwnership } from "@/lib/session";


export class SupplierInvoiceService {
  /**
   * Generates a new supplier invoice snapshot.
   */
  static async generateInvoice(partyId, intakeIds, advanceIds, adjustmentsByIntake = {}, entryDate = null, tx = prisma) {
    // 1. Fetch live data for event records
    const parsedIntakeIds = Array.from(new Set(intakeIds.map(id => {
      const str = String(id);
      if (str.includes("-track-")) {
        return parseInt(str.split("-track-")[0]);
      }
      return parseInt(str);
    })));

    const [intakes, advances] = await Promise.all([
      tx.intakeTransaction.findMany({
        where: { id: { in: parsedIntakeIds } },
        include: { 
          product: true,
          salesTracks: {
            where: { isSettled: false }
          }
        }
      }),
      tx.intakeAdvance.findMany({
        where: { id: { in: advanceIds.map(id => parseInt(id)) } }
      })
    ]);

    if (intakes.length === 0) throw new Error("No intakes selected");

    // 2. Decompose intakes into separate portion rows
    const decomposedIntakes = [];
    intakes.forEach(intake => {
      const tracksToSettle = (intake.salesTracks || []).filter(t => !t.isSettled);
      if (tracksToSettle.length > 0) {
        tracksToSettle.forEach(track => {
          const virtualId = `${intake.id}-track-${track.id}`;
          if (intakeIds.includes(virtualId)) {
            decomposedIntakes.push({
              ...intake,
              virtualId,
              grossWeight: Number(track.quantity),
              netWeight: Number(track.netWeight || track.quantity),
              rate: Number(track.sellingRate),
              rateUnit: track.rateUnit || DEFAULT_WEIGHT_UNIT,
              salesTracks: [track]
            });
          }
        });
      } else {
        if (intakeIds.includes(String(intake.id))) {
          decomposedIntakes.push(intake);
        }
      }
    });

    // 2.5 Map adjustments to decomposed intakes and compute totals via centralized financial logic
    const intakesWithAdjustments = decomposedIntakes.map(intake => ({
      ...intake,
      adjustments: adjustmentsByIntake[intake.virtualId] || adjustmentsByIntake[intake.id] || []
    }));

    const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakesWithAdjustments);
    const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
    const finalPayableAmount = netValue - totalAdvances;

    // 3. Prepare immutable snapshots for items with nested adjustments
    const itemsData = decomposedIntakes.map(intake => {
      let billingWeight = 0;
      if (intake.salesTracks && intake.salesTracks.length > 0) {
        billingWeight = intake.salesTracks.reduce((sum, track) => sum + Number(track.quantity || 0), 0);
      } else {
        billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
      }
      const actualRate = convertRate(intake.rate, intake.rateUnit || DEFAULT_WEIGHT_UNIT, intake.unit || DEFAULT_WEIGHT_UNIT, intake.product);
      const rate = actualRate ? Number(actualRate) : 0;
      
      const breakdown = intakeBreakdowns.find(b => b.intakeId === (intake.virtualId || intake.id));
      const itemAdjustments = breakdown ? breakdown.adjustments : [];
      const grossAmount = breakdown ? breakdown.gross : (billingWeight * rate);
      const averageRate = billingWeight > 0 ? (grossAmount / billingWeight) : rate;

      return {
        intakeTransactionId: intake.id,
        weight: billingWeight,
        rate: averageRate,
        amount: grossAmount,
        adjustments: itemAdjustments
      };
    });

    // 4. Sequence number
    const invoiceNumber = await SupplierInvoiceRepository.getNextInvoiceNumber(tx);

    const selectedTrackIds = intakeIds
      .filter(id => String(id).includes("-track-"))
      .map(id => parseInt(String(id).split("-track-")[1]));

    // 5. Create derived document record
    const ownership = await withOwnership();

    const invoice = await SupplierInvoiceRepository.createWithItems(
      {
        invoiceNumber,
        partyId: parseInt(partyId),
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        totalGrossValue,
        totalDeductions,
        totalAdvances,
        finalPayableAmount,
        status: "PENDING",
        version: 1,
        lastCalculatedAt: new Date(),
        userId: ownership.userId,
        businessId: ownership.businessId
      },
      itemsData,
      advanceIds,
      selectedTrackIds,
      tx
    );

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: invoice.id,
      action: "CREATED",
      description: `Supplier settlement ${invoice.invoiceNumber} generated`,
      meta: {
        supplierId: invoice.partyId,
        totalGrossValue: Number(invoice.totalGrossValue),
        finalPayableAmount: Number(invoice.finalPayableAmount)
      }
    });

    return JSON.parse(JSON.stringify(invoice));
  }

  /**
    * Regenerates a new version of an invoice, preserving the old one.
    */
   static async regenerateInvoice(oldInvoiceId, adjustmentsByIntake = null) {
     const oldInvoice = await SupplierInvoiceRepository.getById(oldInvoiceId);
     if (!oldInvoice) throw new Error("Invoice not found");
 
     // 1. Collect IDs from the old derived document to pull fresh data
     const intakeIds = oldInvoice.items.map(i => i.intakeTransactionId);
     const advanceIds = oldInvoice.advances.map(a => a.id);
 
     // 2. Execute atomic transaction to guarantee state consistency
     const ownership = await withOwnership();
     const newInvoice = await prisma.$transaction(async (tx) => {
       // Mark old invoice as SUPERSEDED and isOutdated
       await tx.supplierInvoice.update({
         where: { id: parseInt(oldInvoiceId) },
         data: { status: "SUPERSEDED", isOutdated: true }
       });
 
       // Reset old sales tracks to unsettled so they can be re-fetched and re-settled!
       await tx.salesTrack.updateMany({
         where: {
           intakeTransactionId: { in: intakeIds },
           isSettled: true
         },
         data: {
           isSettled: false
         }
       });
 
       // Fetch fresh records inside transaction!
       const [intakes, advances] = await Promise.all([
         tx.intakeTransaction.findMany({
           where: { id: { in: intakeIds } },
           include: { 
             product: true,
             salesTracks: {
               where: { isSettled: false }
             }
           }
         }),
         tx.intakeAdvance.findMany({
           where: { id: { in: advanceIds } }
         })
       ]);
 
       // Resolve adjustments to use (fall back to old invoice adjustments if none provided)
       let adjustmentsToUse = {};
       if (adjustmentsByIntake && Object.keys(adjustmentsByIntake).length > 0) {
         adjustmentsToUse = adjustmentsByIntake;
       } else {
         oldInvoice.items.forEach(item => {
           adjustmentsToUse[item.intakeTransactionId] = (item.adjustments || []).map(adj => ({
             adjustmentType: adj.adjustmentType,
             method: adj.method,
             value: Number(adj.value),
             direction: adj.direction
           }));
         });
       }
 
       // Decompose intakes into separate portion rows
       const decomposedIntakes = [];
       intakes.forEach(intake => {
         const tracksToSettle = (intake.salesTracks || []).filter(t => !t.isSettled);
         if (tracksToSettle.length > 0) {
           tracksToSettle.forEach(track => {
             decomposedIntakes.push({
               ...intake,
               virtualId: `${intake.id}-track-${track.id}`,
               grossWeight: Number(track.quantity),
               netWeight: Number(track.netWeight || track.quantity),
               rate: Number(track.sellingRate),
               rateUnit: track.rateUnit || DEFAULT_WEIGHT_UNIT,
               salesTracks: [track]
             });
           });
         } else {
           decomposedIntakes.push(intake);
         }
       });
 
       // Map adjustments and recalculate
       const intakesWithAdjustments = decomposedIntakes.map(intake => ({
         ...intake,
         adjustments: adjustmentsToUse[intake.virtualId] || adjustmentsToUse[intake.id] || []
       }));
 
       const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakesWithAdjustments);
       const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
       const finalPayableAmount = netValue - totalAdvances;
 
       // Prepare item snapshots
       const itemsData = decomposedIntakes.map(intake => {
         let billingWeight = 0;
         if (intake.salesTracks && intake.salesTracks.length > 0) {
           billingWeight = intake.salesTracks.reduce((sum, track) => sum + Number(track.quantity || 0), 0);
         } else {
           billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
         }
         const actualRate = convertRate(intake.rate, intake.rateUnit || DEFAULT_WEIGHT_UNIT, intake.unit || DEFAULT_WEIGHT_UNIT, intake.product);
         const rate = actualRate ? Number(actualRate) : 0;
         
         const breakdown = intakeBreakdowns.find(b => b.intakeId === (intake.virtualId || intake.id));
         const itemAdjustments = breakdown ? breakdown.adjustments : [];
         const grossAmount = breakdown ? breakdown.gross : (billingWeight * rate);
         const averageRate = billingWeight > 0 ? (grossAmount / billingWeight) : rate;
 
         return {
           intakeTransactionId: intake.id,
           weight: billingWeight,
           rate: averageRate,
           amount: grossAmount,
           adjustments: itemAdjustments
         };
       });
 
       // Create new version
       const newInvoice = await tx.supplierInvoice.create({
         data: {
           invoiceNumber: oldInvoice.invoiceNumber,
           partyId: oldInvoice.partyId,
           entryDate: oldInvoice.entryDate,
           totalGrossValue,
           totalDeductions,
           totalAdvances,
           finalPayableAmount,
           status: "PENDING",
           version: oldInvoice.version + 1,
           lastCalculatedAt: new Date(),
           userId: ownership.userId,
           businessId: ownership.businessId,
           items: {
             create: itemsData.map(item => ({
               weight: item.weight,
               rate: item.rate,
               amount: item.amount,
               userId: ownership.userId,
               businessId: ownership.businessId,
               intake: { connect: { id: parseInt(item.intakeTransactionId) } },
               adjustments: {
                 create: (item.adjustments || []).map(adj => ({
                   adjustmentType: adj.adjustmentType,
                   method: adj.method,
                   value: adj.value,
                   calculatedAmount: adj.calculatedAmount,
                   direction: adj.direction,
                   unit: adj.unit || null,
                   userId: ownership.userId,
                   businessId: ownership.businessId
                 }))
               }
             }))
           },
           advances: {
             connect: advanceIds.map(id => ({ id: parseInt(id) }))
           }
         },
         include: {
           items: {
             include: {
               intake: { include: { product: true } },
               adjustments: true
             }
           },
           advances: true,
           party: true
         }
       });
 
       // Mark sales tracks as settled
       await tx.salesTrack.updateMany({
         where: {
           intakeTransactionId: { in: intakeIds },
           isSettled: false
         },
         data: {
           isSettled: true
         }
       });
 
       return newInvoice;
     });

      await emitActivity({
        entityType: "SETTLEMENT",
        entityId: parseInt(oldInvoiceId),
        action: "SUPERSEDED",
        description: `Supplier invoice ID ${oldInvoiceId} superseded by version ${newInvoice.version} (${newInvoice.invoiceNumber})`,
        meta: { supersededById: newInvoice.id }
      });

      await emitActivity({
        entityType: "SETTLEMENT",
        entityId: newInvoice.id,
        action: "CREATED",
        description: `Supplier invoice ${newInvoice.invoiceNumber} generated via regeneration (v${newInvoice.version})`,
        meta: {
          supplierId: newInvoice.partyId,
          totalGrossValue: Number(newInvoice.totalGrossValue),
          finalPayableAmount: Number(newInvoice.finalPayableAmount)
        }
      });

      return JSON.parse(JSON.stringify(newInvoice));
   }

  /**
   * Edits an invoice by generating a new version with updated selections and adjustments.
   */
  static async editInvoice(oldInvoiceId, newIntakeIds, newAdvanceIds, newAdjustmentsByIntake, entryDate = null) {
    const oldInvoice = await SupplierInvoiceRepository.getById(oldInvoiceId);
    if (!oldInvoice) throw new Error("Invoice not found");

    if (oldInvoice.status !== "PENDING") {
      throw new Error("Only PENDING invoices can be edited");
    }

    const ownership = await withOwnership();

    const newInvoice = await prisma.$transaction(async (tx) => {
      // 1. Mark old invoice as SUPERSEDED and isOutdated
      await tx.supplierInvoice.update({
        where: { id: parseInt(oldInvoiceId) },
        data: { status: "SUPERSEDED", isOutdated: true }
      });

      // 1.5 Reset old sales tracks to unsettled so they can be re-fetched if selected
      const oldIntakeIds = oldInvoice.items.map(item => item.intakeTransactionId);
      await tx.salesTrack.updateMany({
        where: {
          intakeTransactionId: { in: oldIntakeIds },
          isSettled: true
        },
        data: {
          isSettled: false
        }
      });

      // 2. Fetch fresh event records
      const parsedNewIntakeIds = Array.from(new Set(newIntakeIds.map(id => {
        const str = String(id);
        if (str.includes("-track-")) {
          return parseInt(str.split("-track-")[0]);
        }
        return parseInt(str);
      })));

      const [intakes, advances] = await Promise.all([
        tx.intakeTransaction.findMany({
          where: { id: { in: parsedNewIntakeIds } },
          include: { 
            product: true,
            salesTracks: {
              where: { isSettled: false }
            }
          }
        }),
        tx.intakeAdvance.findMany({
          where: { id: { in: newAdvanceIds.map(id => parseInt(id)) } }
        })
      ]);

      if (intakes.length === 0) throw new Error("No intakes selected");

      // Decompose intakes into separate portion rows
      const decomposedIntakes = [];
      intakes.forEach(intake => {
        const tracksToSettle = (intake.salesTracks || []).filter(t => !t.isSettled);
        if (tracksToSettle.length > 0) {
          tracksToSettle.forEach(track => {
            const virtualId = `${intake.id}-track-${track.id}`;
            if (newIntakeIds.includes(virtualId)) {
              decomposedIntakes.push({
                ...intake,
                virtualId,
                grossWeight: Number(track.quantity),
                netWeight: Number(track.netWeight || track.quantity),
                rate: Number(track.sellingRate),
                rateUnit: track.rateUnit || DEFAULT_WEIGHT_UNIT,
                salesTracks: [track]
              });
            }
          });
        } else {
          if (newIntakeIds.includes(String(intake.id))) {
            decomposedIntakes.push(intake);
          }
        }
      });

      // 3. Map adjustments and recalculate
      const intakesWithAdjustments = decomposedIntakes.map(intake => ({
        ...intake,
        adjustments: newAdjustmentsByIntake[intake.virtualId] || newAdjustmentsByIntake[intake.id] || []
      }));

      const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakesWithAdjustments);
      const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
      const finalPayableAmount = netValue - totalAdvances;

      // 4. Prepare item snapshots
      const itemsData = decomposedIntakes.map(intake => {
        let billingWeight = 0;
        if (intake.salesTracks && intake.salesTracks.length > 0) {
          billingWeight = intake.salesTracks.reduce((sum, track) => sum + Number(track.quantity || 0), 0);
        } else {
          billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
        }
        const actualRate = convertRate(intake.rate, intake.rateUnit || DEFAULT_WEIGHT_UNIT, intake.unit || DEFAULT_WEIGHT_UNIT, intake.product);
        const rate = actualRate ? Number(actualRate) : 0;
        
        const breakdown = intakeBreakdowns.find(b => b.intakeId === (intake.virtualId || intake.id));
        const itemAdjustments = breakdown ? breakdown.adjustments : [];
        const grossAmount = breakdown ? breakdown.gross : (billingWeight * rate);
        const averageRate = billingWeight > 0 ? (grossAmount / billingWeight) : rate;

        return {
          intakeTransactionId: intake.id,
          weight: billingWeight,
          rate: averageRate,
          amount: grossAmount,
          adjustments: itemAdjustments
        };
      });

      // 5. Create NEW version with a new invoice number but incremented version
      const lastInvoice = await tx.supplierInvoice.findFirst({
        orderBy: { id: "desc" },
        select: { id: true }
      });
      const nextId = (lastInvoice?.id || 0) + 1;
      const invoiceNumber = `SUP-${nextId.toString().padStart(6, "0")}`;

      const newInvoice = await tx.supplierInvoice.create({
        data: {
          invoiceNumber,
          partyId: oldInvoice.partyId,
          entryDate: entryDate ? new Date(entryDate) : oldInvoice.entryDate,
          totalGrossValue,
          totalDeductions,
          totalAdvances,
          finalPayableAmount,
          status: "PENDING",
          version: oldInvoice.version + 1,
          lastCalculatedAt: new Date(),
          userId: ownership.userId,
          businessId: ownership.businessId,
          items: {
            create: itemsData.map(item => ({
              weight: item.weight,
              rate: item.rate,
              amount: item.amount,
              userId: ownership.userId,
              businessId: ownership.businessId,
              intake: { connect: { id: parseInt(item.intakeTransactionId) } },
              adjustments: {
                create: (item.adjustments || []).map(adj => ({
                  adjustmentType: adj.adjustmentType,
                  code: adj.code || "CUSTOM",
                  isLegacySnapshot: adj.isLegacySnapshot === true,
                  isUserEditable: typeof adj.isUserEditable !== "undefined" ? adj.isUserEditable : true,
                  method: adj.method,
                  value: adj.value,
                  calculatedAmount: adj.calculatedAmount,
                  direction: adj.direction,
                  unit: adj.unit || null,
                  userId: ownership.userId,
                  businessId: ownership.businessId
                }))
              }
            }))
          },
          advances: {
            connect: newAdvanceIds.map(id => ({ id: parseInt(id) }))
          }
        },
        include: {
          items: {
            include: {
              intake: { include: { product: true } },
              adjustments: true
            }
          },
          advances: true,
          party: true
        }
      });

      // Mark new sales tracks as settled
      const newSelectedTrackIds = newIntakeIds
        .filter(id => String(id).includes("-track-"))
        .map(id => parseInt(String(id).split("-track-")[1]));

      if (newSelectedTrackIds.length > 0) {
        await tx.salesTrack.updateMany({
          where: {
            id: { in: newSelectedTrackIds }
          },
          data: {
            isSettled: true
          }
        });
      } else {
        const newIntakeIdsParsed = newIntakeIds.map(id => parseInt(id));
        await tx.salesTrack.updateMany({
          where: {
            intakeTransactionId: { in: newIntakeIdsParsed },
            isSettled: false
          },
          data: {
            isSettled: true
          }
        });
      }

      return newInvoice;
    });

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: parseInt(oldInvoiceId),
      action: "SUPERSEDED",
      description: `Supplier invoice ID ${oldInvoiceId} superseded by version ${newInvoice.version} (${newInvoice.invoiceNumber}) via edit`,
      meta: { supersededById: newInvoice.id }
    });

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: newInvoice.id,
      action: "CREATED",
      description: `Supplier invoice ${newInvoice.invoiceNumber} generated via edit (v${newInvoice.version})`,
      meta: {
        supplierId: newInvoice.partyId,
        totalGrossValue: Number(newInvoice.totalGrossValue),
        finalPayableAmount: Number(newInvoice.finalPayableAmount)
      }
    });

    return JSON.parse(JSON.stringify(newInvoice));
  }

  /**
   * Soft-deletes an invoice by marking it as deleted.
   * Reverts related sales track settlements so intakes can be re-invoiced.
   * Only PENDING invoices can be soft-deleted.
   */
  static async deleteInvoice(invoiceId, deleteReason, tx = prisma) {
    const runOperations = async (dbClient) => {
      const invoice = await dbClient.supplierInvoice.findUnique({
        where: { id: parseInt(invoiceId) },
        include: { items: true }
      });
      if (!invoice) throw new Error("Invoice not found");

      if (invoice.status !== "PENDING") {
        throw new Error("Only PENDING invoices can be deleted");
      }

      let deletedBy = null;
      try {
        const { getSession } = await import("@/lib/session");
        const session = await getSession();
        if (session) deletedBy = session.userId;
      } catch (e) {}

      // Revert sales track settlements so intakes can be re-invoiced
      const oldIntakeIds = invoice.items.map(item => item.intakeTransactionId);
      await dbClient.salesTrack.updateMany({
        where: {
          intakeTransactionId: { in: oldIntakeIds },
          isSettled: true
        },
        data: { isSettled: false }
      });

      // Disconnect advances from this invoice
      await dbClient.intakeAdvance.updateMany({
        where: { supplierInvoiceId: parseInt(invoiceId) },
        data: { supplierInvoiceId: null }
      });

      await dbClient.supplierInvoice.update({
        where: { id: parseInt(invoiceId) },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy || null,
          deleteReason: deleteReason || null,
        }
      });

      return invoice;
    };

    let invoice;
    if (tx === prisma) {
      invoice = await prisma.$transaction(async (nestedTx) => {
        return runOperations(nestedTx);
      });
    } else {
      invoice = await runOperations(tx);
    }

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: parseInt(invoiceId),
      action: "DELETED",
      description: `Supplier invoice ID ${invoiceId} (${invoice.invoiceNumber}) soft-deleted.${deleteReason ? ` Reason: ${deleteReason}` : ""}`,
      meta: { supplierId: invoice.partyId, invoiceNumber: invoice.invoiceNumber, deleteReason }
    });

    return { success: true };
  }

  /**
   * HARD DELETE — permanently removes an invoice from the database.
   * Only PENDING invoices can be hard-deleted.
   * Requires an active Destructive Mode session.
   */
  static async hardDeleteInvoice(invoiceId, deleteReason, tx = prisma) {
    const runOperations = async (dbClient) => {
      const invoice = await dbClient.supplierInvoice.findUnique({
        where: { id: parseInt(invoiceId) },
        include: { items: true }
      });
      if (!invoice) throw new Error("Invoice not found");

      if (invoice.status !== "PENDING") {
        throw new Error("Only PENDING invoices can be permanently deleted");
      }

      // 1. Disconnect any advances linked to this invoice
      await dbClient.intakeAdvance.updateMany({
        where: { supplierInvoiceId: parseInt(invoiceId) },
        data: { supplierInvoiceId: null }
      });

      // 2. Reset old sales tracks to unsettled
      const oldIntakeIds = invoice.items.map(item => item.intakeTransactionId);
      await dbClient.salesTrack.updateMany({
        where: {
          intakeTransactionId: { in: oldIntakeIds },
          isSettled: true
        },
        data: { isSettled: false }
      });

      // 3. Hard delete (cascade handles items and adjustments via DB schema)
      await dbClient.supplierInvoice.delete({
        where: { id: parseInt(invoiceId) }
      });

      return invoice;
    };

    let invoice;
    if (tx === prisma) {
      invoice = await prisma.$transaction(async (nestedTx) => {
        return runOperations(nestedTx);
      });
    } else {
      invoice = await runOperations(tx);
    }

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: parseInt(invoiceId),
      action: "HARD_DELETED",
      description: `Supplier invoice ID ${invoiceId} (${invoice.invoiceNumber}) PERMANENTLY deleted.${deleteReason ? ` Reason: ${deleteReason}` : ""}`,
      meta: { supplierId: invoice.partyId, invoiceNumber: invoice.invoiceNumber, deleteReason }
    });

    return { success: true };
  }

  static async recordPayment(id, amount) {
    const invoiceId = parseInt(id);
    const amt = Number(amount);
    if (isNaN(invoiceId)) throw new Error("Invalid Supplier Invoice ID");
    if (isNaN(amt) || amt <= 0) throw new Error("Payment amount must be greater than zero");

    const updated = await prisma.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.findUnique({
        where: { id: invoiceId }
      });

      if (!invoice) throw new Error("Supplier invoice not found");
      if (invoice.status === "SUPERSEDED") throw new Error("Cannot record payment on a superseded invoice");
      if (invoice.status === "CANCELLED") throw new Error("Cannot record payment on a cancelled invoice");

      const total = Number(invoice.finalPayableAmount);
      const allocations = await tx.partyPaymentAllocation.findMany({
        where: {
          referenceType: "SETTLEMENT",
          referenceId: invoiceId,
          payment: { status: "ACTIVE" }
        }
      });
      const clearing = calculateInvoiceClearingFromAllocations(total, allocations);

      if (amt > clearing.remaining) {
        throw new Error("Payment amount Rs. " + amt + " exceeds the remaining balance of Rs. " + clearing.remaining);
      }

      const virtualAllocations = [...allocations, { allocatedAmount: amt }];
      const newClearing = calculateInvoiceClearingFromAllocations(total, virtualAllocations);
      
      const updatedInvoice = await tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newClearing.paid,
          paymentStatus: newClearing.paymentStatus,
          status: newClearing.paymentStatus
        }
      });
      await SupplierInvoiceService.syncLinkedIntakeStatus(invoiceId, tx);
      return updatedInvoice;
    });

    // Fetch session details
    let performedByUserId = 0;
    let performedByName = "system";
    try {
      const { getSession } = await import("@/lib/session");
      const session = await getSession();
      if (session) {
        performedByUserId = session.userId || 0;
        performedByName = session.userName || "system";
      }
    } catch (e) {}

    // Fetch Party details
    let partyName = "";
    try {
      const { PartyRepository } = await import("@/modules/parties/repositories/PartyRepository");
      const party = await PartyRepository.getById(updated.partyId);
      if (party) {
        partyName = party.name;
      }
    } catch (e) {}

    const action = updated.status === "CLEARED" ? "CLEARED" : "UPDATED";

    // Log overall payment event
    const paymentDescription = `${performedByName} recorded invoice payment of Rs. ${amt.toLocaleString()} for ${partyName || "Party #" + updated.partyId} on Supplier Invoice ${updated.invoiceNumber}.`;
    await logPaymentEvent({
      partyId: updated.partyId,
      partyName,
      paymentType: "CASH_OUT",
      eventType: "SETTLEMENT_PAYMENT",
      amount: amt,
      description: paymentDescription,
      performedByUserId,
      performedByName,
      performedByUserId,
      performedByName,
      referenceType: "SETTLEMENT",
      referenceId: updated.id,
      referenceNumber: updated.invoiceNumber,
      meta: {
        paidAmount: Number(updated.paidAmount),
        paymentStatus: updated.paymentStatus
      }
    });

    // Log settlement update
    const settlementDescription = `Recorded invoice payment of Rs. ${amt.toLocaleString()} on Supplier Invoice ${updated.invoiceNumber}. Total paid: Rs. ${Number(updated.paidAmount).toLocaleString()}`;
    await logSettlementEvent({
      settlementId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      partyId: updated.partyId,
      partyName,
      action,
      description: settlementDescription,
      amount: amt,
      performedByUserId,
      performedByName,
      meta: {
        paymentStatus: updated.paymentStatus,
        paidAmount: Number(updated.paidAmount)
      }
    });

    return updated;
  }

  static async generateInvoiceForPurchaseIntake(intake, advanceIds = [], tx = prisma) {
    return this.generateInvoice(
      intake.partyId,
      [intake.id],
      advanceIds,
      {},
      intake.entryDate,
      tx
    );
  }

  static async updateInvoiceAndRecalculate(invoiceId, tx = prisma) {
    const invoice = await tx.supplierInvoice.findUnique({
      where: { id: parseInt(invoiceId) },
      include: {
        items: {
          include: {
            intake: {
              include: { product: true }
            },
            adjustments: true
          }
        },
        advances: true
      }
    });
    if (!invoice) return;

    // 1. Map the items to calculate deductions using the centralized lib/financial utility
    const mappedIntakes = invoice.items.map(item => {
      const intake = item.intake;
      if (!intake) return null;

      // Ensure the latest rates/weights from the intake are used
      const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined
        ? Number(intake.netWeight)
        : Number(intake.grossWeight);

      return {
        ...intake,
        virtualId: item.id,
        grossWeight: Number(intake.grossWeight),
        netWeight: intake.netWeight !== null ? Number(intake.netWeight) : null,
        bagCount: Number(intake.bagCount || 0),
        rate: intake.rate ? Number(intake.rate) : null,
        rateUnit: intake.rateUnit || DEFAULT_WEIGHT_UNIT,
        unit: intake.unit || DEFAULT_WEIGHT_UNIT,
        product: intake.product,
        adjustments: item.adjustments.map(adj => ({
          id: adj.id,
          adjustmentType: adj.adjustmentType,
          code: adj.code,
          method: adj.method,
          value: Number(adj.value),
          direction: adj.direction,
          unit: adj.unit
        }))
      };
    }).filter(Boolean);

    if (mappedIntakes.length === 0) return;

    // Call existing calculation engine!
    const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(mappedIntakes);

    // 2. Write the updated calculations back to database items and item adjustments
    for (const breakdown of intakeBreakdowns) {
      const itemId = breakdown.intakeId; // this is the virtualId we assigned (item.id)
      
      const item = invoice.items.find(i => i.id === itemId);
      const product = item.intake.product;
      const actualRate = convertRate(item.intake.rate, item.intake.rateUnit || DEFAULT_WEIGHT_UNIT, item.intake.unit || DEFAULT_WEIGHT_UNIT, product);
      
      // Update item totals
      await tx.supplierInvoiceItem.update({
        where: { id: itemId },
        data: {
          weight: breakdown.gross / (actualRate ? Number(actualRate) : 1), // weight used for gross calculation
          rate: actualRate ? Number(actualRate) : 0,
          amount: breakdown.gross
        }
      });

      // Update adjustments' calculatedAmount
      for (const adjBreakdown of breakdown.adjustments) {
        const dbAdj = item.adjustments.find(a => a.adjustmentType === adjBreakdown.adjustmentType && a.code === adjBreakdown.code);
        if (dbAdj) {
          await tx.supplierInvoiceAdjustment.update({
            where: { id: dbAdj.id },
            data: {
              calculatedAmount: adjBreakdown.calculatedAmount
            }
          });
        }
      }
    }

    // 3. Compute final payable amount including advances linked to the invoice
    const totalAdvances = invoice.advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
    const finalPayableAmount = netValue - totalAdvances;

    // 4. Recalculate payment status based on allocations using the existing engine
    const allocations = await tx.partyPaymentAllocation.findMany({
      where: {
        referenceType: "SETTLEMENT",
        referenceId: invoice.id,
        payment: { status: "ACTIVE" }
      }
    });
    const newClearing = calculateInvoiceClearingFromAllocations(finalPayableAmount, allocations);

    // 5. Update invoice
    const updatedInvoice = await tx.supplierInvoice.update({
      where: { id: invoice.id },
      data: {
        partyId: mappedIntakes[0].partyId, // Sync supplier partyId in case it was updated on the intake!
        totalGrossValue,
        totalDeductions,
        finalPayableAmount,
        paidAmount: newClearing.paid,
        paymentStatus: newClearing.paymentStatus,
        status: newClearing.paymentStatus
      }
    });

    // Also sync the partyId of any linked advances to match the new supplier!
    if (invoice.advances.length > 0) {
      await tx.intakeAdvance.updateMany({
        where: { id: { in: invoice.advances.map(a => a.id) } },
        data: { partyId: mappedIntakes[0].partyId }
      });
    }

    await this.syncLinkedIntakeStatus(invoice.id, tx);
    return updatedInvoice;
  }

  static async updateLinkedAutoInvoice(intake, tx = prisma) {
    const item = await tx.supplierInvoiceItem.findFirst({
      where: { intakeTransactionId: intake.id }
    });
    if (!item) return;

    await this.updateInvoiceAndRecalculate(item.invoiceId, tx);
  }

  static async updateInvoicePaymentStatus(invoiceId, newPaid, newPaymentStatus, tx) {
    await tx.supplierInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaid,
        paymentStatus: newPaymentStatus,
        status: newPaymentStatus
      }
    });
    await this.syncLinkedIntakeStatus(invoiceId, tx);
  }

  static async syncLinkedIntakeStatus(invoiceId, tx) {
    const invoice = await tx.supplierInvoice.findUnique({
      where: { id: parseInt(invoiceId) },
      include: { items: { include: { intake: true } } }
    });
    if (!invoice) return;

    const { getFeatureFlags } = await import("@/lib/settings/featureFlags");
    const flags = await getFeatureFlags();
    if (flags.intakeMode === "PURCHASE") {
      const targetStatus = invoice.status === "CLEARED" ? "CLEARED" : "PENDING";
      for (const item of invoice.items) {
        if (item.intake && item.intake.status !== targetStatus) {
          await tx.intakeTransaction.update({
            where: { id: item.intake.id },
            data: { status: targetStatus }
          });
        }
      }
    }
  }
}

