"use client";

import React from "react";
import Modal from "./Modal";

/**
 * Reusable modal for duplicate warnings.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to run on close/cancel
 * @param {Function} props.onConfirm - Callback to run on confirmation
 * @param {string} props.duplicateMessage - The explanation of what duplicate was found
 * @param {string} [props.entityName] - The name of the entity (e.g. "Party", "Product")
 * @param {boolean} [props.loading] - Whether the modal is in a loading state
 */
export default function DuplicateWarningModal({
  isOpen,
  onClose,
  onConfirm,
  duplicateMessage,
  title,
  entityName = "Party",
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      type="warning"
      title={title || `Duplicate ${entityName} Detected`}
      confirmLabel="Yes, Save Anyway"
      onConfirm={onConfirm}
      cancelLabel="Cancel"
      loading={loading}
    >
      <div className="space-y-3">
        <p className="text-sm text-foreground">
          {duplicateMessage}
        </p>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to save this {entityName.toLowerCase()} anyway?
        </p>
      </div>
    </Modal>
  );
}
