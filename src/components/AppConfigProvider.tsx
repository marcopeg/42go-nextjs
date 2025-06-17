"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import { type AppConfig, type AppName, availableApps } from "@/AppConfig"; // Updated import path

// Context and hook unified here
const AppConfigContext = createContext<AppConfig | null>(null);

const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  return context;
};

interface AppConfigProviderProps {
  children: React.ReactNode;
}

const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    console.log("AppConfigProvider: useEffect running");
    let resolvedConfig: AppConfig | null = null;

    // Get app name from the data-app-name attribute on the html element
    const appNameFromAttribute = document.documentElement.dataset
      .appName as AppName;

    if (appNameFromAttribute && availableApps[appNameFromAttribute]) {
      resolvedConfig = availableApps[appNameFromAttribute];
      console.log(
        "AppConfigProvider: Config set from html data-app-name attribute:",
        resolvedConfig
      );
    } else {
      console.warn(
        "AppConfigProvider: No valid data-app-name attribute found, and no DEFAULT_APP set. Using null config."
      );
    }

    setConfig(resolvedConfig);
  }, []);

  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
};

export default AppConfigProvider;
export { AppConfigProvider, AppConfigContext, useAppConfig };
