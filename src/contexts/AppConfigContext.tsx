import { createContext, useContext } from "react";
import type { AppConfig } from "../AppConfig"; // Updated import path

export const AppConfigContext = createContext<AppConfig | null>(null);

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  return context;
};
