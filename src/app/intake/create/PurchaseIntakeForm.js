"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { getProductValidationState } from "@/modules/products/utils/productValidation";
import { normalizeQuantity, normalizeRate } from "@/lib/units";
import { calculateTransactionTotals, round } from "@/lib/financial";
import TransactionHeader from "@/components/transaction/TransactionHeader";
import TransactionProductTable from "@/components/transaction/TransactionProductTable";
import TransactionTotals from "@/components/transaction/TransactionTotals";
import TransactionSettlement from "@/components/transaction/TransactionSettlement";
import { createPurchaseDocumentAction } from "@/modules/intake/controllers/intakeActions";
import { toast } from "sonner";
import { getProductForIntake } from "@/modules/products/services/ProductInteractionService";
import { fastEntryMemoryStore } from "@/lib/fastEntryMemoryStore";

export default function PurchaseIntakeForm({ suppliers, products, settings, backUrl, featureFlags, adjustmentDefinitions = [] }) {
  const { currencySymbol = "Rs.", decimalPlaces = 2 } = settings || {};
  const router = useRouter();

  // ── Purchase Mode States ──
  const [purchaseItems, setPurchaseItems] = useState([
    {
      id: "row-0",
      productId: "",
      weight: "",
      unit: "KG",
      rate: "",
      rateUnit: "KG",
      amount: 0,
      useHelper: false,
      helperQuantity: "",
      helperSizePerUnit: "",
      helperUnitLabel: "Bag"
    }
  ]);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [isNewPurchaseSupplier, setIsNewPurchaseSupplier] = useState(false);
  const [newPurchaseSupplierData, setNewPurchaseSupplierData] = useState({ name: "", phoneNumber: "", address: "", notes: "" });
  const [purchaseAdjustments, setPurchaseAdjustments] = useState(() => {
    return (adjustmentDefinitions || [])
      .filter(d => d.isEnabledByDefault)
      .map(d => ({
        code: d.code,
        adjustmentType: d.name,
        method: d.method,
        value: d.defaultConfiguredValue !== null ? d.defaultConfiguredValue : "",
        direction: d.direction,
        unit: "KG",
        isUserEditable: d.isUserEditable
      }));
  });
  const [amountPaid, setAmountPaid] = useState("");
  const [isPurchaseSubmitting, setIsPurchaseSubmitting] = useState(false);
  const [focusedPurchaseRowIndex, setFocusedPurchaseRowIndex] = useState(0);
  const [unitRegistry, setUnitRegistry] = useState(null);

  const supplierOptions = React.useMemo(() => [
    { value: "new", label: "➕ Add New Supplier", specialOption: true },
    ...suppliers.map(s => ({
      value: s.id.toString(),
      label: s.name,
      subLabel: s.phoneNumber
    }))
  ], [suppliers]);

  useEffect(() => {
    async function loadData() {
      const res = await getUnitRegistryAction();
      if (res.success) {
        setUnitRegistry(res.data);
      }
    }
    loadData();
  }, []);

  // ── Purchase Mode Handlers ──
  const purchaseTotals = useMemo(() => {
    const processedItems = purchaseItems.map(item => {
      const product = products.find(p => p.id === parseInt(item.productId));
      if (!product) return { baseQuantity: 0, normalizedRate: 0 };
      try {
        const nWeight = normalizeQuantity(item.weight || 0, item.unit || "KG", product, unitRegistry);
        const nRate = normalizeRate(item.rate || 0, item.rateUnit || "KG", product, unitRegistry);
        return { baseQuantity: nWeight, normalizedRate: nRate, product };
      } catch (e) {
        return { baseQuantity: 0, normalizedRate: 0 };
      }
    });

    return calculateTransactionTotals(processedItems, purchaseAdjustments);
  }, [purchaseItems, purchaseAdjustments, products, unitRegistry]);

  const handleResetPurchase = () => {
    setPurchaseItems([
      {
        id: "row-" + Date.now(),
        productId: "",
        weight: "",
        unit: "KG",
        rate: "",
        rateUnit: "KG",
        amount: 0,
        useHelper: false,
        helperQuantity: "",
        helperSizePerUnit: "",
        helperUnitLabel: "Bag"
      }
    ]);
    setAmountPaid("");
    setPurchaseNotes("");
    setIsNewPurchaseSupplier(false);
    setNewPurchaseSupplierData({ name: "", phoneNumber: "", address: "", notes: "" });
    setFocusedPurchaseRowIndex(0);
    toast.info("Cart cleared.");
  };

  const handleAddPurchaseItem = () => {
    setPurchaseItems(prev => [
      ...prev,
      {
        id: "row-" + Date.now() + Math.random(),
        productId: "",
        weight: "",
        unit: "KG",
        rate: "",
        rateUnit: "KG",
        amount: 0,
        useHelper: false,
        helperQuantity: "",
        helperSizePerUnit: "",
        helperUnitLabel: "Bag"
      }
    ]);
  };

  const handleRemovePurchaseItem = (index) => {
    setPurchaseItems(prev => {
      if (prev.length <= 1) {
        return [{
          id: "row-" + Date.now(),
          productId: "",
          weight: "",
          unit: "KG",
          rate: "",
          rateUnit: "KG",
          amount: 0,
          useHelper: false,
          helperQuantity: "",
          helperSizePerUnit: "",
          helperUnitLabel: "Bag"
        }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleChangePurchaseItem = async (index, field, value) => {
    if (field === "productId" && value) {
      const sessionMemory = {
        lastUnit: fastEntryMemoryStore.getLastValue("lastUnit", "intake"),
      };
      const result = await getProductForIntake(value, sessionMemory);

      setPurchaseItems(prev => {
        const newItems = [...prev];
        newItems[index] = { ...newItems[index], [field]: value };

        if (result.success) {
          const { defaults } = result;
          newItems[index].unit = defaults.unit;
          newItems[index].rateUnit = defaults.unit;
          
          if (defaults.buyingRate) {
            newItems[index].rate = defaults.buyingRate.toString();
          } else if (defaults.rate) {
            newItems[index].rate = defaults.rate.toString();
          }
        }

        const existingItemWithSameProd = prev.find(item => item.productId === value && item.rate);
        if (existingItemWithSameProd) {
          newItems[index].rate = existingItemWithSameProd.rate;
          newItems[index].rateUnit = existingItemWithSameProd.rateUnit || newItems[index].unit;
        }

        if (index === prev.length - 1) {
          newItems.push({
            id: "row-" + Date.now() + Math.random(),
            productId: "",
            weight: "",
            unit: "KG",
            rate: "",
            rateUnit: "KG",
            amount: 0,
            useHelper: false,
            helperQuantity: "",
            helperSizePerUnit: "",
            helperUnitLabel: "Bag"
          });
        }

        if (newItems[index].useHelper) {
          const qty = parseFloat(newItems[index].helperQuantity) || 0;
          const size = parseFloat(newItems[index].helperSizePerUnit) || 0;
          if (qty && size) {
            newItems[index].weight = (qty * size).toString();
          } else {
            newItems[index].weight = "";
          }
        }

        const prod = products.find(p => p.id === parseInt(newItems[index].productId));
        if (prod) {
          try {
            const nQty = normalizeQuantity(newItems[index].weight || 0, newItems[index].unit || "KG", prod, unitRegistry);
            const nRate = normalizeRate(newItems[index].rate || 0, newItems[index].rateUnit || "KG", prod, unitRegistry);
            newItems[index].amount = round(nQty * nRate);
          } catch (e) {
            newItems[index].amount = 0;
          }
        } else {
          newItems[index].amount = 0;
        }

        return newItems;
      });
    } else {
      setPurchaseItems(prev => {
        const newItems = [...prev];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "useHelper" && !value) {
          newItems[index].helperQuantity = "";
          newItems[index].helperSizePerUnit = "";
        }

        if (newItems[index].useHelper) {
          const qty = parseFloat(newItems[index].helperQuantity) || 0;
          const size = parseFloat(newItems[index].helperSizePerUnit) || 0;
          if (qty && size) {
            newItems[index].weight = (qty * size).toString();
          } else {
            newItems[index].weight = "";
          }
        }

        if (field === "productId" && !value) {
          newItems[index].rate = "";
        }

        const prod = products.find(p => p.id === parseInt(newItems[index].productId));
        if (prod) {
          try {
            const nQty = normalizeQuantity(newItems[index].weight || 0, newItems[index].unit || "KG", prod, unitRegistry);
            const nRate = normalizeRate(newItems[index].rate || 0, newItems[index].rateUnit || "KG", prod, unitRegistry);
            newItems[index].amount = round(nQty * nRate);
          } catch (e) {
            newItems[index].amount = 0;
          }
        } else {
          newItems[index].amount = 0;
        }

        return newItems;
      });
    }
  };

  const handleSavePurchase = async () => {
    if (!purchaseSupplierId) {
      toast.error("Please select a supplier first.");
      return;
    }
    const validItems = purchaseItems.filter(item => item.productId && item.weight && item.rate);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item with product, weight, and rate.");
      return;
    }

    setIsPurchaseSubmitting(true);
    try {
      const payload = {
        partyId: purchaseSupplierId === "new" ? "new" : parseInt(purchaseSupplierId),
        entryDate: purchaseInvoiceDate,
        items: validItems.map(item => {
          const packagingMeta = item.useHelper && item.helperQuantity && item.helperSizePerUnit ? {
            type: item.helperUnitLabel || "Bag",
            count: parseFloat(item.helperQuantity),
            sizePerUnit: parseFloat(item.helperSizePerUnit),
            unitLabel: item.unit || "KG"
          } : null;
          return {
            productId: parseInt(item.productId),
            grossWeight: parseFloat(item.weight),
            netWeight: parseFloat(item.weight),
            unit: item.unit,
            rate: parseFloat(item.rate),
            rateUnit: item.rateUnit,
            bagCount: item.useHelper && item.helperUnitLabel.toLowerCase() === "bag" ? parseFloat(item.helperQuantity) : 0,
            packagingMeta: packagingMeta,
            notes: purchaseNotes
          };
        }),
        adjustments: purchaseAdjustments.map(adj => ({
          ...adj,
          value: adj.value === "" ? 0 : Number(adj.value)
        })),
        amountPaid: parseFloat(amountPaid) || 0,
        paymentMethod: "CASH",
        notes: purchaseNotes
      };

      if (purchaseSupplierId === "new") {
        payload.newPartyData = {
          name: newPurchaseSupplierData.name,
          phoneNumber: newPurchaseSupplierData.phoneNumber,
          address: newPurchaseSupplierData.address,
          notes: newPurchaseSupplierData.notes,
          partyType: "SUPPLIER"
        };
      }

      const res = await createPurchaseDocumentAction(payload);
      if (res.success) {
        toast.success("Purchase recorded successfully.");
        router.push(backUrl || "/intake");
      } else {
        toast.error(res.error || "Failed to save purchase document.");
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || "An error occurred.");
    } finally {
      setIsPurchaseSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-3 select-none">
      {/* Header */}
      <TransactionHeader
        router={router}
        buyerId={purchaseSupplierId}
        setBuyerId={setPurchaseSupplierId}
        setIsNewBuyer={setIsNewPurchaseSupplier}
        buyerOptions={supplierOptions.map(opt => ({
          ...opt,
          label: opt.value === "new" ? "➕ Add New Supplier" : opt.label
        }))}
        invoiceDate={purchaseInvoiceDate}
        setInvoiceDate={setPurchaseInvoiceDate}
        handleReset={handleResetPurchase}
        isSubmitting={isPurchaseSubmitting}
        handleSave={handleSavePurchase}
        isNewBuyer={isNewPurchaseSupplier}
        newBuyerData={newPurchaseSupplierData}
        setNewBuyerData={setNewPurchaseSupplierData}
        showScanner={false}
        showCheckoutNew={false}
        showPrint={false}
        partyLabel="Supplier"
        dateLabel="Entry Date"
        partyPlaceholder="Select Supplier..."
        newPartySectionTitle="New Supplier Quick Master Setup"
        partyNameLabel="Supplier Name"
        saveLabel="Complete Purchase"
        backUrl={backUrl || "/intake"}
      />

      {/* Table */}
      <div className="flex-1 min-h-0 flex flex-col">
        <TransactionProductTable
          items={purchaseItems}
          products={products}
          onChangeItem={handleChangePurchaseItem}
          onAddItem={handleAddPurchaseItem}
          onRemoveItem={handleRemovePurchaseItem}
          focusedRowIndex={focusedPurchaseRowIndex}
          setFocusedRowIndex={setFocusedPurchaseRowIndex}
          unitRegistry={unitRegistry}
          currencySymbol={currencySymbol}
          decimalPlaces={decimalPlaces}
        />
      </div>

      {/* Totals & Settlement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="md:col-span-2">
          <TransactionTotals
            totals={purchaseTotals}
            adjustments={purchaseAdjustments}
            onAddAdjustment={(adj) => setPurchaseAdjustments(prev => [...prev, adj])}
            onRemoveAdjustment={(idx) => setPurchaseAdjustments(prev => prev.filter((_, i) => i !== idx))}
            onEditAdjustmentValue={(idx, val) => setPurchaseAdjustments(prev => {
              const copy = [...prev];
              copy[idx].value = val;
              return copy;
            })}
            adjustmentDefinitions={adjustmentDefinitions}
            notes={purchaseNotes}
            onChangeNotes={setPurchaseNotes}
          />
        </div>
        <div className="md:col-span-1">
          <TransactionSettlement
            finalAmount={purchaseTotals.finalAmount}
            cashReceived={amountPaid}
            onChangeCashReceived={setAmountPaid}
            layout="settlement"
          />
        </div>
      </div>
    </div>
  );
}
