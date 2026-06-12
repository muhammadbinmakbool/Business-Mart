"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getActiveSessionAction } from "@/modules/auth/controllers/userActions";

const AuthContext = createContext();

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isDestructiveActive, setIsDestructiveActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const activeSession = await getActiveSessionAction();
      setCurrentUser(activeSession);

      if (activeSession && ADMIN_ROLES.includes(activeSession.role)) {
        const { getDestructiveModeStatusAction } = await import("@/modules/auth/controllers/destructiveActions");
        const status = await getDestructiveModeStatusAction();
        setIsDestructiveActive(status.active);
      } else {
        setIsDestructiveActive(false);
      }
    } catch (e) {
      console.error("Failed to load active session:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isDestructiveActive,
        loading,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
