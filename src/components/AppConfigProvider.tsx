"use client";

import React, { useEffect, useState } from "react";
import { AppConfigContext } from "@/contexts/AppConfigContext";
import { type AppConfig, type AppName } from "@/AppConfig.type"; // Changed path
import { setups, DEFAULT_APP_NAME } from "@/AppConfig"; // Changed path, added DEFAULT_APP_NAME

interface AppConfigProviderProps {
  children: React.ReactNode;
}

const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    console.log("AppConfigProvider: useEffect running");
    const scriptTag = document.getElementById("__APP_NAME__"); // Updated script tag ID
    let resolvedConfig: AppConfig | null = setups[DEFAULT_APP_NAME] || null;

    if (scriptTag && scriptTag.textContent) {
      try {
        // Assuming the script tag now contains the AppName directly as a string,
        // not JSON.parse, consistent with how setupName was previously planned to be passed.
        const appNameFromScript = scriptTag.textContent as AppName;
        console.log(
          "AppConfigProvider: Found script tag, app name:",
          appNameFromScript
        );
        if (setups[appNameFromScript]) {
          resolvedConfig = setups[appNameFromScript];
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
          "AppConfigProvider: Failed to process __APP_NAME__ script content:", // Updated script tag ID in log
          error
        );
      }
    } else {
      // If the script tag isn't found, try to get appName from data attribute on html tag
      const appNameFromAttribute = document.documentElement.dataset
        .appName as AppName;
      if (appNameFromAttribute && setups[appNameFromAttribute]) {
        resolvedConfig = setups[appNameFromAttribute];
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
