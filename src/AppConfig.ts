import type { AppConfig, SetupName } from "./AppConfig.type.ts";

export const setups: Record<SetupName, AppConfig> = {
  app1: {
    name: "APP n1",
    origin: "http://app1.localhost:3000",
    // featureFlags: { newUi: true },
    // logo: 'app1_logo.svg'
  },
  app2: {
    name: "APP n2",
    origin: "http://app2.localhost:3000",
    // featureFlags: { newUi: false },
    // logo: 'app2_logo.svg'
  },
  default: {
    name: "DEFAULT APP",
    origin: "http://localhost:3000",
    // featureFlags: { newUi: false },
    // logo: 'default_logo.svg'
  },
};
