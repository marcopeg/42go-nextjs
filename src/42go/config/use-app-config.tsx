"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { apps, type TAppConfig, type TAppID } from "@/AppConfig";

declare global {
  interface Window {
    __APP_ID__?: TAppID;
  }
}

const AppIDContext = createContext<TAppID>(null);

export const AppConfigProvider = ({
  appID,
  children,
}: {
  appID: TAppID;
  children: ReactNode;
}) => <AppIDContext.Provider value={appID}>{children}</AppIDContext.Provider>;

export function useAppID(): TAppID {
  const contextAppID = useContext(AppIDContext);
  if (contextAppID) return contextAppID;

  if (typeof window !== "undefined") {
    return window.__APP_ID__ as TAppID;
  }
  return null;
}

export function useAppConfig(): TAppConfig {
  const appID = useAppID();
  return useMemo(() => (appID && apps[appID] ? apps[appID] : null), [appID]);
}
