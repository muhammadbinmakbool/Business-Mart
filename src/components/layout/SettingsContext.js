"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  businessName: "Business Mart",
  address: "Grain Market, Rahim Yar Khan, Punjab, Pakistan",
  logoPath: "",
  currencyCode: "PKR",
  currencySymbol: "Rs.",
  defaultLanguage: "en",
  timezone: "Asia/Karachi",
  dateFormat: "DD/MM/YYYY",
  decimalPlaces: 2,
  showFastEntryHelper: true,
  unitDisplayPrecision: 2,
  unitLabelFormat: "short"
};

export function SettingsProvider({ children, initialSettings = {} }) {
  const [settings, setSettingsState] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...initialSettings
  }));

  const updateSettings = useCallback((newSettings) => {
    setSettingsState((prev) => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  const decimalPlaces = settings?.decimalPlaces !== undefined && settings?.decimalPlaces !== null
    ? Number(settings.decimalPlaces)
    : 2;

  const currencySymbol = settings?.currencySymbol || "Rs.";

  const unitDisplayPrecision = settings?.unitDisplayPrecision !== undefined && settings?.unitDisplayPrecision !== null
    ? Number(settings.unitDisplayPrecision)
    : 2;

  const unitLabelFormat = settings?.unitLabelFormat || "short";

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        decimalPlaces,
        currencySymbol,
        unitDisplayPrecision,
        unitLabelFormat
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
