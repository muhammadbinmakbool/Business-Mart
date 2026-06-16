"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Edit2, Sliders, Settings, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import DataTable from "@/components/ui/DataTable";
import PaginationControls from "@/components/ui/PaginationControls";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import Modal from "@/components/ui/Modal";
import { showToast } from "@/components/ui/Toast";
import DeleteButton from "@/components/DeleteButton";
import {
  createAdjustmentAction,
  updateAdjustmentAction,
  deleteAdjustmentAction,
  toggleAdjustmentStatusAction
} from "@/modules/adjustments/controllers/adjustmentActions";

export default function AdjustmentsListClient({
  adjustments = [],
  totalCount = 0,
  currentPage = 1,
  currentLimit = 50,
  currentSearch = "",
  currentApplicableTo = "ALL",
  onRefresh
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [applicableFilter, setApplicableFilter] = useState(currentApplicableTo);

  // Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdj, setEditingAdj] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [method, setMethod] = useState("FIXED");
  const [direction, setDirection] = useState("ADD");
  const [defaultConfiguredValue, setDefaultConfiguredValue] = useState("");
  const [isUserEditable, setIsUserEditable] = useState(true);
  const [isEnabledByDefault, setIsEnabledByDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [applicableTo, setApplicableTo] = useState("BOTH");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setSearchQuery(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    setApplicableFilter(currentApplicableTo);
  }, [currentApplicableTo]);

  const updateFilters = (updates) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    if (!("page" in updates)) {
      params.set("page", "1");
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOpenCreate = () => {
    setEditingAdj(null);
    setFormErrors({});
    setCode("");
    setName("");
    setMethod("FIXED");
    setDirection("ADD");
    setDefaultConfiguredValue("");
    setIsUserEditable(true);
    setIsEnabledByDefault(false);
    setIsActive(true);
    setApplicableTo("BOTH");
    setDisplayOrder("0");
    setDescription("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (adj) => {
    setEditingAdj(adj);
    setFormErrors({});
    setCode(adj.code);
    setName(adj.name);
    setMethod(adj.method);
    setDirection(adj.direction);
    setDefaultConfiguredValue(adj.defaultConfiguredValue !== null ? String(adj.defaultConfiguredValue) : "");
    setIsUserEditable(adj.isUserEditable);
    setIsEnabledByDefault(adj.isEnabledByDefault);
    setIsActive(adj.isActive);
    setApplicableTo(adj.applicableTo);
    setDisplayOrder(String(adj.displayOrder || 0));
    setDescription(adj.description || "");
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!editingAdj) {
      if (!code.trim()) {
        errors.code = "Code is required";
      } else if (!/^[A-Z0-9_]+$/.test(code)) {
        errors.code = "Code must contain only uppercase letters, numbers, and underscores";
      }
    }
    if (!name.trim()) {
      errors.name = "Name is required";
    }
    if (defaultConfiguredValue !== "" && isNaN(Number(defaultConfiguredValue))) {
      errors.defaultConfiguredValue = "Default value must be a valid number";
    }
    if (isNaN(Number(displayOrder))) {
      errors.displayOrder = "Display order must be an integer";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      method,
      direction,
      defaultConfiguredValue: defaultConfiguredValue !== "" ? Number(defaultConfiguredValue) : null,
      isUserEditable,
      isEnabledByDefault,
      isActive,
      applicableTo,
      displayOrder: parseInt(displayOrder) || 0,
      description: description.trim() || null
    };

    try {
      let res;
      if (editingAdj) {
        res = await updateAdjustmentAction(editingAdj.id, payload);
      } else {
        res = await createAdjustmentAction(payload);
      }

      if (res.success) {
        showToast.success(
          editingAdj
            ? `Adjustment "${payload.name}" updated successfully`
            : `Adjustment "${payload.name}" created successfully`
        );
        setIsFormOpen(false);
        onRefresh?.();
        router.refresh();
      } else {
        showToast.error(res.error || "Failed to save adjustment definition");
      }
    } catch (err) {
      showToast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentVal) => {
    const newVal = !currentVal;
    try {
      const res = await toggleAdjustmentStatusAction(id, newVal);
      if (res.success) {
        showToast.success(`Adjustment status updated`);
        onRefresh?.();
        router.refresh();
      } else {
        showToast.error(res.error || "Failed to toggle status");
      }
    } catch (err) {
      showToast.error(err.message || "Failed to toggle status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adjustment Templates</h1>
          <p className="text-muted-foreground">Define and configure reusable billing adjustment templates (e.g. taxes, fees, commissions).</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Template
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <DebouncedSearchInput
          value={searchQuery}
          onChange={(val) => updateFilters({ search: val })}
          placeholder="Search templates..."
        />

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">Applicable To:</label>
          <select
            value={applicableFilter}
            onChange={(e) => updateFilters({ applicableTo: e.target.value })}
            className="h-10 px-3 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          >
            <option value="ALL">All Targets</option>
            <option value="BUYER">Buyer Invoices Only</option>
            <option value="SUPPLIER">Supplier Settlements Only</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <DataTable
          data={adjustments}
          emptyMessage="No adjustment templates found."
          containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
          rowClassName={(row) => cn(!row.isActive && "opacity-50")}
          columns={[
            {
              key: "displayOrder",
              label: "Order",
              className: "px-3 py-2.5 text-center font-mono text-xs text-muted-foreground w-12",
            },
            {
              key: "name",
              label: "Template Name",
              className: "px-3 py-2.5 font-bold text-sm",
              render: (row, val) => (
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 bg-primary/10 rounded-md shrink-0">
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span>{val}</span>
                    {row.isSystemDefined && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-500 uppercase mt-0.5">
                        <Lock className="h-2 w-2 shrink-0" /> System Locked
                      </span>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: "code",
              label: "Code",
              className: "px-3 py-2.5 font-mono text-xs uppercase text-muted-foreground",
            },
            {
              key: "applicableTo",
              label: "Applicable To",
              className: "px-3 py-2.5 text-center text-xs font-bold text-muted-foreground",
              render: (row, val) => (
                <span className="px-2 py-0.5 rounded bg-muted text-[10px] uppercase">
                  {val === "BOTH" ? "Buyer & Supplier" : val}
                </span>
              )
            },
            {
              key: "method",
              label: "Method / Rule",
              className: "px-3 py-2.5 text-center text-xs font-bold",
              render: (row) => {
                const methodMap = {
                  FIXED: "Fixed Amount",
                  PERCENTAGE: "Percentage (%)",
                  PER_WEIGHT: "Per Unit Weight",
                  PER_BAG: "Per Bag"
                };
                const dirMap = {
                  ADD: "Added (+)",
                  SUBTRACT: "Deducted (-)"
                };
                return (
                  <div className="flex flex-col items-center">
                    <span className="text-foreground">{methodMap[row.method]}</span>
                    <span className={cn("text-[9px] uppercase mt-0.5 font-bold", row.direction === "ADD" ? "text-emerald-600" : "text-rose-600")}>
                      {dirMap[row.direction]}
                    </span>
                  </div>
                );
              }
            },
            {
              key: "defaultConfiguredValue",
              label: "Default Value",
              className: "px-3 py-2.5 text-right font-mono font-bold text-xs",
              render: (row, val) => {
                if (val === null || val === undefined) return <span className="text-muted-foreground font-normal">None</span>;
                if (row.method === "PERCENTAGE") return `${val.toFixed(2)}%`;
                return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            },
            {
              key: "isUserEditable",
              label: "User Override",
              className: "px-3 py-2.5 text-center",
              render: (row, val) => (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                    val
                      ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30"
                      : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
                  )}
                >
                  {val ? "Allowed" : "Locked"}
                </span>
              )
            },
            {
              key: "isActive",
              label: "Active status",
              className: "px-3 py-2.5 text-center",
              render: (row, val) => (
                <button
                  onClick={() => handleToggleStatus(row.id, val)}
                  disabled={row.isSystemDefined}
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border cursor-pointer select-none",
                    row.isSystemDefined && "cursor-not-allowed opacity-80",
                    val
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-rose-100 text-rose-700 border-rose-200"
                  )}
                >
                  {val ? "Active" : "Disabled"}
                </button>
              )
            },
            {
              key: "actions",
              label: "Actions",
              className: "px-3 py-2.5 text-center w-20",
              sortable: false,
              render: (row) => (
                <div className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenEdit(row)}
                    className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    title="Edit Template"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {!row.isSystemDefined ? (
                    <DeleteButton
                      id={row.id}
                      deleteAction={deleteAdjustmentAction}
                      label="Adjustment Template"
                      variant="icon"
                      onSuccess={onRefresh}
                    />
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center text-muted-foreground/30">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              )
            }
          ]}
        />

        <PaginationControls
          currentPage={currentPage}
          totalCount={totalCount}
          limit={currentLimit}
          onPageChange={(newPage) => updateFilters({ page: newPage })}
          onLimitChange={(newLimit) => updateFilters({ limit: newLimit })}
        />
      </div>

      {/* Create / Edit Modal Form */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAdj ? "Edit Adjustment Template" : "Add Adjustment Template"}
        description={editingAdj ? "Modify properties of this existing adjustment template." : "Define a new dynamic adjustment definition template."}
        confirmLabel={editingAdj ? "Save Changes" : "Create Template"}
        onConfirm={handleSubmit}
        loading={isSubmitting}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Code */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Template Code</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. LABOUR_FEE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  disabled={!!editingAdj}
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed font-mono uppercase"
                  required
                />
                {editingAdj && (
                  <span className="absolute right-3 top-2.5 text-muted-foreground/60" title="Code is immutable after creation">
                    <Lock className="h-4 w-4" />
                  </span>
                )}
              </div>
              {formErrors.code && <p className="text-[10px] text-destructive font-bold">{formErrors.code}</p>}
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Labour Charges"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                required
              />
              {formErrors.name && <p className="text-[10px] text-destructive font-bold">{formErrors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Target */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Target Document</label>
              <select
                value={applicableTo}
                onChange={(e) => setApplicableTo(e.target.value)}
                className="w-full h-10 px-3 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              >
                <option value="BOTH">Both (Buyer & Supplier)</option>
                <option value="BUYER">Buyer Invoices Only</option>
                <option value="SUPPLIER">Supplier Settlements Only</option>
              </select>
            </div>

            {/* Calculation Method */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Calculation Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={editingAdj?.isSystemDefined}
                className="w-full h-10 px-3 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="PER_WEIGHT">Per Unit Weight</option>
                <option value="PER_BAG">Per Bag</option>
              </select>
            </div>

            {/* Direction */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                disabled={editingAdj?.isSystemDefined}
                className="w-full h-10 px-3 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="ADD">Add (+) to invoice</option>
                <option value="SUBTRACT">Deduct (-) from invoice</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Default Value */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Default Rate / Value</label>
              <input
                type="text"
                placeholder="e.g. 1.5"
                value={defaultConfiguredValue}
                onChange={(e) => setDefaultConfiguredValue(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              />
              {formErrors.defaultConfiguredValue && <p className="text-[10px] text-destructive font-bold">{formErrors.defaultConfiguredValue}</p>}
            </div>

            {/* Display Order */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Display Order</label>
              <input
                type="number"
                placeholder="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              />
              {formErrors.displayOrder && <p className="text-[10px] text-destructive font-bold">{formErrors.displayOrder}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
            <textarea
              placeholder="Provide a detailed explanation of this adjustment template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground resize-y"
            />
          </div>

          {/* Configuration Switches */}
          <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Default Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-foreground">User Editable</span>
                <span className="text-xs text-muted-foreground">Allows operators to override default rates during billing.</span>
              </div>
              <input
                type="checkbox"
                checked={isUserEditable}
                onChange={(e) => setIsUserEditable(e.target.checked)}
                className="h-5 w-5 rounded border-muted text-primary focus:ring-primary/20 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-foreground">Enabled by Default</span>
                <span className="text-xs text-muted-foreground">Automatically pre-selects and applies this adjustment on new invoices.</span>
              </div>
              <input
                type="checkbox"
                checked={isEnabledByDefault}
                onChange={(e) => setIsEnabledByDefault(e.target.checked)}
                className="h-5 w-5 rounded border-muted text-primary focus:ring-primary/20 cursor-pointer"
              />
            </div>

            {!editingAdj?.isSystemDefined && (
              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-foreground">Active Status</span>
                  <span className="text-xs text-muted-foreground">Enables or disables template selection in billing workflows.</span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-5 w-5 rounded border-muted text-primary focus:ring-primary/20 cursor-pointer"
                />
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
