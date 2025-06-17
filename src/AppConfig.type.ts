import { setups } from "./AppConfig";

export interface AppConfig {
  name: string;
  origin: string; // Common property
  // Optional properties for extensibility
  logo?: string;
  featureFlags?: Record<string, boolean>;
  // Add other common properties here
}

export type AppName = keyof typeof setups;

// DEFAULT_SETUP_NAME will be moved to AppConfig.ts
