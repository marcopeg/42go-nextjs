"use client";

import React, { createContext, useContext } from "react";
import { type AppConfig, type AppName, availableApps } from "@/AppConfig";

// Extend window type for TypeScript
declare global {
  interface Window {
    __APP_NAME__?: AppName;
  }
}

/**
 * Get the app configuration synchronously from the window variable
 * set by the server-side layout.
 */
const getConfig = (): AppConfig => {
  if (typeof window !== "undefined" && window.__APP_NAME__) {
    const appName = window.__APP_NAME__;

    console.log("@@@@@@ AppConfigProvider: App name from window:", appName);

    if (appName && availableApps[appName]) {
      console.log(
        "@@@@@@ AppConfigProvider: Successfully resolved config for:",
        appName
      );
      return availableApps[appName];
    }
  }

  console.warn(
    "AppConfigProvider: Could not determine app config from window.__APP_NAME__",
    {
      hasWindow: typeof window !== "undefined",
      windowAppName:
        typeof window !== "undefined" ? window.__APP_NAME__ : "undefined",
      availableApps: Object.keys(availableApps),
    }
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
 * This component provides the config that is determined synchronously
 * from the window.__APP_NAME__ variable set by the server.
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
