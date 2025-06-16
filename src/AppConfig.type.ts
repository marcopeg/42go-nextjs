export interface AppConfig {
  name: string;
  origin: string; // Common property
  // Optional properties for extensibility
  logo?: string;
  featureFlags?: Record<string, boolean>;
  // Add other common properties here
}

export type SetupName = "app1" | "app2" | "default";

// Export as a const value, not just a type
export const DEFAULT_SETUP_NAME: SetupName = "default";
