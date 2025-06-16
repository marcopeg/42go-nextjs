import type { AppConfig } from "@/AppConfig";

// Define more specific setup names if they are fixed, or use string for dynamic names
export type SetupName = "app1" | "app2" | "default";

export const DEFAULT_SETUP_NAME: SetupName = "default";

// Example of what AppConfig might look like if expanded
// export interface AppConfig {
//   name: string;
//   origin: string;
//   featureFlags?: { [key: string]: boolean };
//   theme?: string;
//   logoComponent?: React.ComponentType; // Example for richer config
// }

export const setups: Record<SetupName, AppConfig> = {
  app1: {
    // name: 'Application One',
    origin: "http://app1.localhost:3000", // Example, adjust as needed
    // featureFlags: { newUi: true },
    // theme: 'dark',
  },
  app2: {
    // name: 'Application Two',
    origin: "http://app2.localhost:3000", // Example, adjust as needed
    // featureFlags: { newUi: false },
    // theme: 'light',
  },
  default: {
    // name: 'Default Application',
    origin: "http://localhost:3000", // Example, adjust as needed
    // featureFlags: { newUi: false },
    // theme: 'default',
  },
};
