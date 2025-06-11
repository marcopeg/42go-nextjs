import { createContext, useContext } from "react";
import type { AppConfig } from "../AppConfig"; // Changed to relative path

export const AppConfigContext = createContext<AppConfig | null>(null);

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  return context;
};
