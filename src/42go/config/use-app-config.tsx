import { useMemo } from "react";
import { apps, type TAppConfig, type TAppID } from "@/AppConfig";

declare global {
  interface Window {
    __APP_ID__?: TAppID;
  }
}

export function useAppID(): TAppID {
  if (typeof window !== "undefined") {
    return window.__APP_ID__ as TAppID;
  }
  return null;
}

export function useAppConfig(): TAppConfig {
  const appID = useAppID();
  return useMemo(() => (appID && apps[appID] ? apps[appID] : null), [appID]);
}
