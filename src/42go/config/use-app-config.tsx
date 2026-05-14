"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { apps, type TAppConfig, type TAppID } from "@/AppConfig";

const AppIDContext = createContext<TAppID>(null);

export const AppConfigProvider = ({
  appID,
  children,
}: {
  appID: TAppID;
  children: ReactNode;
}) => <AppIDContext.Provider value={appID}>{children}</AppIDContext.Provider>;

export function useAppID(): TAppID {
  return useContext(AppIDContext);
}

export function useAppConfig(): TAppConfig {
  const appID = useAppID();
  return useMemo(() => (appID && apps[appID] ? apps[appID] : null), [appID]);
}
