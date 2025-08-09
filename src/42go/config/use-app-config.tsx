import { useMemo } from "react";
import { apps, type AppConfig, type AppName } from "@/AppConfig";

declare global {
  interface Window {
    __APP_NAME__?: AppName;
  }
}

export function useAppName(): AppName {
  if (typeof window !== "undefined") {
    return window.__APP_NAME__ as AppName;
  }
  return null;
}

export function useAppConfig(): AppConfig {
  const appName = useAppName();
  return useMemo(
    () => (appName && apps[appName] ? apps[appName] : null),
    [appName]
  );
}
