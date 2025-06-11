"use client";

import React, { useEffect, useState } from "react";
import { AppConfigContext } from "@/contexts/AppConfigContext"; // Keep this for the context itself
import type { AppConfig } from "../AppConfig"; // Import AppConfig from new location

interface AppConfigProviderProps {
  children: React.ReactNode;
}

const AppConfigProvider: React.FC<AppConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    console.log("AppConfigProvider: useEffect running");
    const scriptTag = document.getElementById("__APP_CONFIG__");
    if (scriptTag && scriptTag.textContent) {
      try {
        console.log(
          "AppConfigProvider: Found script tag, parsing content:",
          scriptTag.textContent
        );
        const parsedConfig = JSON.parse(scriptTag.textContent) as AppConfig;
        setConfig(parsedConfig);
        console.log(
          "AppConfigProvider: Config set from script tag",
          parsedConfig
        );
      } catch (error) {
        console.error(
          "AppConfigProvider: Failed to parse __APP_CONFIG__ script content:",
          error
        );
      }
    } else {
      console.warn(
        "AppConfigProvider: __APP_CONFIG__ script tag not found or empty."
      );
    }
  }, []);

  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
};

export default AppConfigProvider;
export { AppConfigProvider };
