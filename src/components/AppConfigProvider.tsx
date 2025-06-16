"use client";

import React, { useEffect, useState } from "react";
import { AppConfigContext } from "@/contexts/AppConfigContext";
import {
  type AppConfig,
  type SetupName,
  DEFAULT_SETUP_NAME,
} from "@/AppConfig.type"; // Changed path
import { setups } from "@/AppConfig"; // Changed path

interface AppConfigProviderProps {
  children: React.ReactNode;
}

const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    console.log("AppConfigProvider: useEffect running");
    const scriptTag = document.getElementById("__APP_SETUP_NAME__");
    let resolvedConfig: AppConfig | null = setups[DEFAULT_SETUP_NAME] || null;

    if (scriptTag && scriptTag.textContent) {
      try {
        const setupNameFromScript = JSON.parse(
          scriptTag.textContent
        ) as SetupName;
        console.log(
          "AppConfigProvider: Found script tag, parsed setup name:",
          setupNameFromScript
        );
        if (setups[setupNameFromScript]) {
          resolvedConfig = setups[setupNameFromScript];
          console.log(
            "AppConfigProvider: Config set from script tag setup name:",
            resolvedConfig
          );
        } else {
          console.warn(
            `AppConfigProvider: No setup found for name '${setupNameFromScript}', using default.`
          );
        }
      } catch (error) {
        console.error(
          "AppConfigProvider: Failed to parse __APP_SETUP_NAME__ script content:",
          error
        );
      }
    } else {
      console.warn(
        "AppConfigProvider: __APP_SETUP_NAME__ script tag not found or empty, using default config."
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
