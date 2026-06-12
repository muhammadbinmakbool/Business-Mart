"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/components/layout/AuthContext";

export default function DeleteButton({ 
  id, 
  deleteAction, 
  hardDeleteAction,
  redirectPath, 
  label = "Item", 
  buttonText,
  variant = "default",
  className,
  onSuccess,
  disabled
}) {
  const { currentUser, isDestructiveActive, loading } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Hide delete trigger completely if loading or if user is not authorized
  if (loading || !currentUser) return null;
  
  const isAuthorized = currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN";
  if (!isAuthorized) {
    return null; 
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      let result;
      if (isDestructiveActive && hardDeleteAction) {
        result = await hardDeleteAction(id, "UI requested permanent delete");
      } else {
        result = await deleteAction(id, "", "UI requested delete");
      }

      if (result?.error) {
        showToast.error(result.error);
      } else {
        showToast.success(
          isDestructiveActive && hardDeleteAction
            ? `${label} permanently deleted successfully`
            : `${label} deleted successfully`
        );
        setIsModalOpen(false);
        if (onSuccess) {
          onSuccess();
        }
        if (redirectPath) {
          router.push(redirectPath);
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      showToast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleTriggerClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsModalOpen(true);
  }

  const modalTitle = isDestructiveActive && hardDeleteAction 
    ? `Permanently Delete ${label}` 
    : `Delete ${label}`;

  const modalDesc = isDestructiveActive && hardDeleteAction
    ? `Permanently deleting this ${label.toLowerCase()} will purge it from the database forever. This action is audited and CANNOT be undone.`
    : `Deleting this ${label.toLowerCase()} will soft-delete it and hide it from normal views. You can restore it later if needed.`;

  const modalConfirmLabel = isDestructiveActive && hardDeleteAction
    ? "Yes, Permanently Delete"
    : `Yes, Delete ${label}`;

  const displayedButtonText = buttonText || (isDestructiveActive && hardDeleteAction ? `Permanently Delete` : `Delete`);

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleTriggerClick}
          disabled={disabled}
          className={cn(
            "rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            disabled && "opacity-40 cursor-not-allowed pointer-events-none",
            className
          )}
          title={displayedButtonText}
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={modalTitle}
          description={modalDesc}
          confirmLabel={modalConfirmLabel}
          loading={isDeleting}
          type="danger"
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleTriggerClick}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 border border-destructive/20 text-destructive px-4 py-2 rounded-lg text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-all group",
          disabled && "opacity-40 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <Trash2 className="h-4 w-4 text-destructive group-hover:text-destructive-foreground" />
        {displayedButtonText}
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={modalTitle}
        description={modalDesc}
        confirmLabel={modalConfirmLabel}
        loading={isDeleting}
        type="danger"
      />
    </>
  );
}
