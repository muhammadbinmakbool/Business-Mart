"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import Modal from "./Modal";

export default function PasswordConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Sensitive Operation",
  description = "This is a secure area. Please confirm your account password to authorize this action.",
  confirmLabel = "Confirm Action",
  loading = false,
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password) return;
    onConfirm(password);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type="warning"
      size="md"
      confirmLabel={confirmLabel}
      onConfirm={handleSubmit}
      loading={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning card inside modal */}
        <div className="flex gap-3 p-3.5 rounded-xl border border-amber-200/60 bg-amber-500/5 text-amber-800 dark:text-amber-500 text-xs">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Identity Verification Mandatory</span>
            <p className="opacity-90 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Input box */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Account Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full h-10 pl-3 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
