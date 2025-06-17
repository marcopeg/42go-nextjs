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
    const scriptTag = document.getElementById("__APP_NAME__");
    let resolvedConfig: AppConfig | null = availableApps[DEFAULT_APP] || null; // Use new names

    if (scriptTag && scriptTag.textContent) {
      try {
        const appNameFromScript = scriptTag.textContent as AppName;
        console.log(
          "AppConfigProvider: Found script tag, app name:",
          appNameFromScript
        );
        if (availableApps[appNameFromScript]) {
          resolvedConfig = availableApps[appNameFromScript]; // Use new names
          console.log(
            "AppConfigProvider: Config set from script tag app name:",
            resolvedConfig
          );
        } else {
          console.warn(
            `AppConfigProvider: No setup found for name '${appNameFromScript}', using default.`
          );
        }
      } catch (error) {
        console.error(
          "AppConfigProvider: Failed to process __APP_NAME__ script content:",
          error
        );
      }
    } else {
      const appNameFromAttribute = document.documentElement.dataset
        .appName as AppName;
      if (appNameFromAttribute && availableApps[appNameFromAttribute]) {
        resolvedConfig = availableApps[appNameFromAttribute]; // Use new names
        console.log(
          "AppConfigProvider: Config set from html data-app-name attribute:",
          resolvedConfig
        );
      } else {
        console.warn(
          "AppConfigProvider: __APP_NAME__ script tag not found or empty, and no/invalid data-app-name attribute, using default config."
        );
      }
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
