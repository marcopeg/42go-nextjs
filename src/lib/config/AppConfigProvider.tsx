"use client";

import React, { createContext, useContext } from "react";
import { type AppConfig, type AppName, availableApps } from "@/AppConfig";

/**
 * The configuration is determined synchronously when this module is loaded
 * on the client-side. This avoids extra re-renders or layout shifts.
 *
 * It relies on the server rendering the `data-app-name` attribute into the
 * `<html>` tag.
 */
const getConfig = (): AppConfig => {
  if (typeof window !== "undefined") {
    const appNameFromAttribute = document.documentElement.dataset
      .appName as AppName;

    if (appNameFromAttribute && availableApps[appNameFromAttribute]) {
      return availableApps[appNameFromAttribute];
    }
  }

  console.warn(
    "AppConfigProvider: Could not determine app config from data attribute."
  );

  return null;
};

/**
 * Context & Hook
 */
const AppConfigContext = createContext<AppConfig>(null);

const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  return context;
};

/**
 * Provider Component
 *
 * This component simply provides the `config` that was determined at the
 * module level. No hooks, no re-renders.
 */
const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <AppConfigContext.Provider value={getConfig()}>
    {children}
  </AppConfigContext.Provider>
);

export default AppConfigProvider;
export { AppConfigProvider, AppConfigContext, useAppConfig };
