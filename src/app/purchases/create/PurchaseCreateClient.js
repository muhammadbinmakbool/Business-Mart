"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/Toast";
import { getLocalDateString } from "@/lib/utils";
import { normalizeQuantity, normalizeRate } from "@/lib/units";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { createPurchaseAction } from "@/modules/purchases/controllers/purchaseActions";
import DocumentLayout from "@/components/DocumentLayout";

/**
 * PurchaseCreateClient Component
 * Client-side controller for recording new Purchase documents.
 * Manages form state, performs derived calculations, and validates inputs.
 */
export default function PurchaseCreateClient({ suppliers = [], products = [], backUrl }) {
  const router = useRouter();

  // 1. Core States
  const [headerValues, setHeaderValues] = useState({
    partyId: "",
    entryDate: getLocalDateString(),
    referenceNumber: "",
    notes: "",
  });

  const [items, setItems] = useState([
    {
      id: Math.random().toString(),
      productId: "",
      weight: "",
      unit: "KG",
      rate: "",
      rateUnit: "KG",
      amount: 0,
    },
  ]);

  const [settlementValues, setSettlementValues] = useState({
    amountPaid: "",
    paymentMethod: "CASH",
    paymentStatus: "UNPAID",
  });

  const [unitRegistry, setUnitRegistry] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Fetch unit registry on mount
  useEffect(() => {
    async function loadUnitRegistry() {
      try {
        const res = await getUnitRegistryAction();
        if (res && res.success) {
          setUnitRegistry(res.data);
        }
      } catch (err) {
        console.error("Failed to load unit registry:", err);
      }
    }
    loadUnitRegistry();
  }, []);

  // 3. Row State Mutators
  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        productId: "",
        weight: "",
        unit: "KG",
        rate: "",
        rateUnit: "KG",
        amount: 0,
      },
    ]);
  };

  const handleDeleteRow = (index) => {
    setItems((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (updated.length === 0) {
        return [
          {
            id: Math.random().toString(),
            productId: "",
            weight: "",
            unit: "KG",
            rate: "",
            rateUnit: "KG",
            amount: 0,
          },
        ];
      }
      return updated;
    });
  };

  const handleCellChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Autocomplete configuration when product changes
      if (field === "productId") {
        const selectedProduct = products.find((p) => p.id === parseInt(value));
        if (selectedProduct) {
          item.unit = selectedProduct.primaryUnit || "KG";
          item.rateUnit = selectedProduct.primaryUnit || "KG";

          if (selectedProduct.defaultBuyingRate) {
            item.rate = Number(selectedProduct.defaultBuyingRate).toString();
          }
        }
      }

      // Sync rateUnit to unit selection by default if rateUnit is empty
      if (field === "unit" && !item.rateUnit) {
        item.rateUnit = value;
      }

      updated[index] = item;
      return updated;
    });
  };

  // 4. Keyboard navigation cell transition
  const handleKeyDown = (index, field, e, isOpen) => {
    if (isOpen) return; // Allow searchable select component dropdown to navigate internally

    const focusCell = (targetIndex, targetField) => {
      const inputId =
        targetField === "productId"
          ? `cell-${targetIndex}-productId`
          : `cell-${targetIndex}-${targetField}`;
      const element = document.getElementById(inputId);
      if (element) {
        element.focus();
        if (element.select) element.select();
        return true;
      }
      return false;
    };

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(index + 1, field);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(index - 1, field);
    } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      if (field === "productId") {
        focusCell(index, "weight");
      } else if (field === "weight") {
        focusCell(index, "unit");
      } else if (field === "unit") {
        focusCell(index, "rate");
      } else if (field === "rate") {
        if (index === items.length - 1) {
          handleAddRow();
          setTimeout(() => {
            focusCell(index + 1, "productId");
          }, 50);
        } else {
          focusCell(index + 1, "productId");
        }
      }
    }
  };

  // 5. Pure Derived Financial States
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const product = products.find((p) => p.id === parseInt(item.productId));
      if (!product || !item.weight || !item.rate) {
        return { ...item, amount: 0 };
      }

      try {
        const baseQuantity = normalizeQuantity(
          item.weight,
          item.unit || "KG",
          product,
          unitRegistry
        );
        const normalizedRate = normalizeRate(
          item.rate,
          item.rateUnit || "KG",
          product,
          unitRegistry
        );
        const amount = baseQuantity * normalizedRate;
        return { ...item, baseQuantity, normalizedRate, amount, product };
      } catch (err) {
        console.error(err);
        return { ...item, amount: 0 };
      }
    });
  }, [items, products, unitRegistry]);

  const totals = useMemo(() => {
    const baseAmount = calculatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const adjustmentsTotal = 0; // Postponed for Phase 1
    const grandTotal = baseAmount + adjustmentsTotal;
    return { baseAmount, adjustmentsTotal, grandTotal };
  }, [calculatedItems]);

  // 6. Automatically sync paymentStatus based on amount paid changes
  useEffect(() => {
    const paid = Number(settlementValues.amountPaid || 0);
    const grand = totals.grandTotal;

    setSettlementValues((prev) => {
      let nextStatus = prev.paymentStatus;
      if (paid === 0) {
        nextStatus = "UNPAID";
      } else if (paid >= grand && grand > 0) {
        nextStatus = "PAID";
      } else if (paid > 0 && paid < grand) {
        nextStatus = "PARTIAL";
      }

      if (nextStatus !== prev.paymentStatus) {
        return { ...prev, paymentStatus: nextStatus };
      }
      return prev;
    });
  }, [settlementValues.amountPaid, totals.grandTotal]);

  // 7. Form Submission Handler
  const handleSave = async () => {
    if (!headerValues.partyId) {
      showToast.error("Supplier Party is required.");
      return;
    }
    if (!headerValues.entryDate) {
      showToast.error("Date is required.");
      return;
    }

    const validItems = calculatedItems.filter(
      (item) => item.productId && Number(item.weight) > 0 && Number(item.rate) > 0
    );

    if (validItems.length === 0) {
      showToast.error(
        "At least one item with valid Product, Quantity, and Rate is required."
      );
      return;
    }

    setIsSubmitting(true);

    const payload = {
      partyId: parseInt(headerValues.partyId),
      entryDate: headerValues.entryDate,
      items: validItems.map((item) => ({
        productId: parseInt(item.productId),
        weight: parseFloat(item.weight),
        unit: item.unit,
        rate: parseFloat(item.rate),
        rateUnit: item.rateUnit || item.unit,
        amount: parseFloat(item.amount || 0),
      })),
      settlement: {
        amountPaid: parseFloat(settlementValues.amountPaid || 0),
        paymentMethod: settlementValues.paymentMethod,
        paymentStatus: settlementValues.paymentStatus,
      },
      totals: {
        baseAmount: totals.baseAmount,
        adjustmentsTotal: totals.adjustmentsTotal,
        grandTotal: totals.grandTotal,
      },
      header: headerValues,
    };

    try {
      const res = await createPurchaseAction(payload);
      if (res.success) {
        showToast.success("Purchase recorded successfully!");
        router.push(`/purchases/${res.data.id}`);
      } else {
        showToast.error(res.error || "Failed to save purchase.");
      }
    } catch (err) {
      showToast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(backUrl);
  };

  return (
    <DocumentLayout
      // Header Props
      headerValues={headerValues}
      onHeaderChange={(field, val) => setHeaderValues((prev) => ({ ...prev, [field]: val }))}
      parties={suppliers}
      partyLabel="Supplier (Party)"
      partyPlaceholder="Select Supplier..."
      isEdit={false}

      // Grid Props
      items={calculatedItems}
      products={products}
      unitRegistry={unitRegistry}
      onCellChange={handleCellChange}
      onKeyDown={handleKeyDown}
      onAddRow={handleAddRow}
      onDeleteRow={handleDeleteRow}

      // Totals Props
      baseAmount={totals.baseAmount}
      adjustmentsTotal={totals.adjustmentsTotal}
      grandTotal={totals.grandTotal}

      // Settlement Props
      settlementValues={settlementValues}
      onSettlementChange={(field, val) =>
        setSettlementValues((prev) => ({ ...prev, [field]: val }))
      }

      // Actions Props
      isSubmitting={isSubmitting}
      onSave={handleSave}
      onCancel={handleCancel}
      saveLabel="Save Purchase"
      cancelLabel="Cancel"
    />
  );
}
