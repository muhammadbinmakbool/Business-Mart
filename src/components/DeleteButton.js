"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import PasswordConfirmModal from "@/components/ui/PasswordConfirmModal";
import { getActiveSessionAction, checkReauthStatusAction } from "@/modules/auth/controllers/userActions";

export default function DeleteButton({ 
  id, 
  deleteAction, 
  redirectPath, 
  label = "Item", 
  buttonText,
  variant = "default",
  className
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [destructiveAllowed, setDestructiveAllowed] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadSessionAndSettings() {
      try {
        const [sess, settingsRes] = await Promise.all([
          getActiveSessionAction(),
          (async () => {
            const { getActivityAuditSettingsAction } = await import("@/modules/settings/controllers/settingsActions");
            return getActivityAuditSettingsAction();
          })()
        ]);
        setCurrentUser(sess);
        if (settingsRes.success) {
          setDestructiveAllowed(settingsRes.settings.allowDestructiveDelete);
        }
      } catch (e) {
        // Fallback for edge cases
      }
    }
    loadSessionAndSettings();
  }, []);

  // 1. Hide delete trigger completely if not loaded, if user is not authorized, or if destructive delete is disabled
  if (!currentUser) return null; // Wait for session load
  if (!destructiveAllowed) return null; // Hide UI button if disabled in settings
  const isAuthorized = currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN";
  if (!isAuthorized) {
    return null; 
  }

  async function handleDeleteConfirm(confirmPassword) {
    setIsDeleting(true);
    try {
      const result = await deleteAction(id, confirmPassword);
      if (result?.error) {
        showToast.error(result.error);
      } else {
        showToast.success(`${label} deleted successfully`);
        setIsModalOpen(false);
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

  async function handleTriggerClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Check if 5-minute re-auth window is valid
    const isReauthCached = await checkReauthStatusAction();
    if (isReauthCached) {
      // Direct deletion with no password prompt needed!
      await handleDeleteConfirm("");
    } else {
      setIsModalOpen(true);
    }
  }

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleTriggerClick}
          className={cn(
            "rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            className
          )}
          title={`Delete ${label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <PasswordConfirmModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${label}`}
          description={`Deleting this ${label.toLowerCase()} is permanent. Please enter your account password to authorize this action.`}
          confirmLabel={`Yes, Delete ${label}`}
          loading={isDeleting}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleTriggerClick}
        className={cn(
          "flex items-center gap-2 border border-destructive/20 text-destructive px-4 py-2 rounded-lg text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-all group",
          className
        )}
      >
        <Trash2 className="h-4 w-4 text-destructive group-hover:text-destructive-foreground" />
        {buttonText || label}
      </button>

      <PasswordConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${label}`}
        description={`Deleting this ${label.toLowerCase()} is permanent and cannot be undone. Please enter your account password to authorize this action.`}
        confirmLabel={`Yes, Delete ${label}`}
        loading={isDeleting}
      />
    </>
  );
}
