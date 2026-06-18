"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Edit2, Trash2, Tags, X, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction
} from "@/modules/products/controllers/productCategoryActions";
import DataTable from "@/components/ui/DataTable";
import { useHeaderAction } from "@/components/layout/HeaderActionContext";

export default function CategoryListClient({ initialCategories = [] }) {
  const router = useRouter();
  
  const [categories, setCategories] = useState(initialCategories);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef(null);

  const openCreateMode = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setIsFormOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const openEditMode = (category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setIsActive(category.isActive);
    setIsFormOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    setName("");
    setDescription("");
    setIsActive(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsSubmitting(true);
    const data = {
      name: name.trim(),
      description: description.trim() || null,
      isActive
    };

    let result;
    if (editingCategory) {
      result = await updateCategoryAction(editingCategory.id, data);
    } else {
      result = await createCategoryAction(data);
    }

    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        editingCategory
          ? "Category updated successfully"
          : "Category created successfully"
      );
      closeForm();
      router.refresh();
      // Optimistically update local UI state or let refresh handle it
      // Standard practice in Next is refresh, which updates page props.
      // But we can also trigger page reload / fetch or rely on Server Actions revalidation.
      // Next.js revalidatePath will update initialCategories on reload.
      // To ensure quick response:
      window.location.reload();
    } else {
      toast.error(result.error || "Something went wrong");
    }
  };

  const handleDelete = async (category) => {
    const activeProductsCount = category._count?.products || 0;
    if (activeProductsCount > 0) {
      toast.error(
        `Deletion Blocked: "${category.name}" has ${activeProductsCount} active product(s) linked to it.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      return;
    }

    const result = await deleteCategoryAction(category.id);
    if (result.success) {
      if (result.warnSoftDeletedProducts) {
        toast.warning(
          `Category deleted. Warning: ${result.softDeletedCount} soft-deleted products remain associated with it.`
        );
      } else {
        toast.success("Category deleted successfully");
      }
      router.refresh();
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to delete category");
    }
  };

  const { setHeaderAction } = useHeaderAction();

  // Register the action button in the persistent tab row
  useEffect(() => {
    if (!isFormOpen) {
      setHeaderAction(
        <button
          onClick={openCreateMode}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      );
    } else {
      setHeaderAction(null);
    }
    return () => setHeaderAction(null);
  }, [isFormOpen, setHeaderAction]);

  return (
    <div className="space-y-4">

      {/* Slide down creation / edit form */}
      {isFormOpen && (
        <div className="rounded-xl border bg-card p-6 shadow-md animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create Product Category"}
            </h2>
            <button
              onClick={closeForm}
              className="rounded-full p-1.5 hover:bg-accent text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="cat-name" className="text-sm font-medium">
                  Category Name
                </label>
                <input
                  id="cat-name"
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grains, Fertilizers, Packaging"
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="cat-status" className="text-sm font-medium">
                  Status
                </label>
                <div className="flex items-center h-10">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="cat-status"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-medium text-muted-foreground">
                      {isActive ? "Active (Visible in dropdowns)" : "Inactive"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="cat-desc" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of products belonging to this category..."
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : editingCategory ? "Update Category" : "Save Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category List table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <DataTable
          data={categories}
          emptyMessage="No product categories configured yet."
          containerClassName="w-full"
          columns={[
            {
              key: "name",
              label: "Category Name",
              className: "px-6 py-4 font-bold text-base flex items-center gap-3",
              render: (row, val) => (
                <>
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Tags className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span>{val}</span>
                    {row.description && (
                      <span className="text-xs text-muted-foreground font-normal line-clamp-1">
                        {row.description}
                      </span>
                    )}
                  </div>
                </>
              )
            },
            {
              key: "productsCount",
              label: "Linked Products",
              className: "px-6 py-4 text-center font-mono font-bold text-muted-foreground",
              render: (row) => row._count?.products || 0
            },
            {
              key: "isActive",
              label: "Status",
              className: "px-6 py-4 text-center",
              render: (row, val) => (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border",
                    val
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-rose-100 text-rose-700 border-rose-200"
                  )}
                >
                  {val ? "Active" : "Inactive"}
                </span>
              )
            },
            {
              key: "actions",
              label: "Actions",
              className: "px-6 py-4 text-right",
              render: (row) => {
                const hasProducts = (row._count?.products || 0) > 0;
                return (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditMode(row)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className={cn(
                        "p-1.5 rounded-md hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors",
                        hasProducts && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                      )}
                      title={
                        hasProducts
                          ? "Cannot delete category with linked products"
                          : "Delete Category"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              }
            }
          ]}
        />
      </div>
    </div>
  );
}
