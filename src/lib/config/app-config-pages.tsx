import { type ComponentType } from "react";
import type { AppConfig } from "@/AppConfig";
import { notFound } from "next/navigation";
import { getAppConfig } from "./app-config";

export type { AppConfig, AppName } from "@/AppConfig";

export const pageWithConfig = <P extends object>(
  PageComponent: ComponentType<P & { config: AppConfig }>,
  requiredFlags?: string
) => {
  const PageWithConfig = async (props: P) => {
    // Hard stop on missing configuration:
    const config = await getAppConfig();
    if (!config) {
      return notFound();
    }

    // Free for all:
    const availableFlags = config.featureFlags.pages;
    if (availableFlags.includes("*")) {
      return <PageComponent {...props} config={config} />;
    }

    // Retrieve the page name from the component's displayName or name
    const flagsToCheck =
      requiredFlags === undefined
        ? PageComponent.displayName || PageComponent.name
        : requiredFlags;

    // Check a specific feature flag for the page
    // "*" means allowed by default
    if (flagsToCheck && flagsToCheck !== "*") {
      const flagBase = flagsToCheck.split(":")[0];
      const hasFeature =
        availableFlags.includes(flagsToCheck) ||
        availableFlags.includes(`${flagBase}:*`) ||
        availableFlags.includes("*");
      if (!hasFeature) {
        return notFound();
      }
    }

    return <PageComponent {...props} config={config} />;
  };

  const displayName =
    PageComponent.displayName || PageComponent.name || "Component";
  PageWithConfig.displayName = `pageWithConfig(${displayName})`;

  return PageWithConfig;
};
