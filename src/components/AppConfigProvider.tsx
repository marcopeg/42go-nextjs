"use client";

import React, { useEffect, useState } from "react";
import { AppConfigContext } from "@/contexts/AppConfigContext";
import {
  type AppConfig,
  type AppName,
  availableApps,
  DEFAULT_APP,
} from "@/AppConfig"; // Updated import path

interface AppConfigProviderProps {
  children: React.ReactNode;
}

const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    console.log("AppConfigProvider: useEffect running");
    let resolvedConfig: AppConfig | null = availableApps[DEFAULT_APP] || null;

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
        "AppConfigProvider: No valid data-app-name attribute found, using default config."
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
export { AppConfigProvider };
