"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, ShieldOff, AlertTriangle, Eye, EyeOff, X, Loader2 } from "lucide-react";
import {
  enterDestructiveModeAction,
  exitDestructiveModeAction,
  getDestructiveModeStatusAction,
} from "@/modules/auth/controllers/destructiveActions";

/**
 * Modal for entering Destructive Mode.
 * Prompts the admin for their password and an optional activation reason.
 */
export function DestructiveModeModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await enterDestructiveModeAction(password, reason);
    setLoading(false);

    if (result.success) {
      onSuccess?.();
      onClose?.();
    } else {
      setError(result.error || "Failed to enter Destructive Mode.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-destructive/40 bg-card shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">Enter Destructive Mode</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Grants temporary permission to permanently delete records. Session expires in 10 minutes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning bar */}
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 mb-5 text-xs text-destructive">
          ⚠️ Permanent deletions cannot be undone. All destructive actions are audited.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Confirm Your Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                autoFocus
                className="w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Reason (optional) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Activation Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you enabling Destructive Mode?"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 transition"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Enable Destructive Mode
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Countdown timer display for an active destructive session.
 */
function DestructiveModeCountdown({ remainingSeconds, onExpire }) {
  const [seconds, setSeconds] = useState(remainingSeconds);

  useEffect(() => {
    setSeconds(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onExpire?.();
      return;
    }
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds, onExpire]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isExpiringSoon = seconds <= 60;

  return (
    <span className={`font-mono text-xs font-bold ${isExpiringSoon ? "text-amber-500 animate-pulse" : "text-white"}`}>
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

/**
 * Topbar Destructive Mode Banner.
 * Shown when Destructive Mode is active — contains exit button and countdown.
 */
export function DestructiveModeBanner({ onExit }) {
  const [remaining, setRemaining] = useState(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    async function poll() {
      const status = await getDestructiveModeStatusAction();
      if (status.active) {
        setRemaining(status.remainingSeconds);
      } else {
        onExit?.();
      }
    }
    poll();
    const interval = setInterval(poll, 30000); // Re-check every 30s
    return () => clearInterval(interval);
  }, [onExit]);

  const handleExit = async () => {
    setExiting(true);
    await exitDestructiveModeAction();
    onExit?.();
  };

  if (remaining === null) return null;

  return (
    <div className="w-full bg-destructive px-4 py-1.5 flex items-center justify-between gap-4 text-white text-sm z-50">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="font-semibold">Destructive Mode Active</span>
        <span className="text-white/70 text-xs">— Permanent deletions are enabled.</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-white/70 text-xs">Expires in:</span>
        <DestructiveModeCountdown
          remainingSeconds={remaining}
          onExpire={onExit}
        />
        <button
          onClick={handleExit}
          disabled={exiting}
          className="flex items-center gap-1.5 rounded-md bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {exiting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
          Exit Destructive Mode
        </button>
      </div>
    </div>
  );
}

/**
 * Destructive Mode toggle button for the user dropdown menu.
 * Visible to Admins/Super Admins only.
 */
export function DestructiveModeToggle({ isDestructiveActive, onEnterClick, onExit }) {
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    await exitDestructiveModeAction();
    onExit?.();
    setExiting(false);
  };

  if (isDestructiveActive) {
    return (
      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-semibold rounded-lg text-amber-600 hover:bg-amber-500/10 transition-colors text-left cursor-pointer disabled:opacity-50"
      >
        <ShieldOff className="h-4 w-4 text-amber-500" />
        {exiting ? "Exiting..." : "Exit Destructive Mode"}
      </button>
    );
  }

  return (
    <button
      onClick={onEnterClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-semibold rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
    >
      <Shield className="h-4 w-4 text-destructive" />
      Enter Destructive Mode
    </button>
  );
}
