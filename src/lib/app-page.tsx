import { type ComponentType } from "react";
import { notFound } from "next/navigation";
import { getAppConfig } from "./app-config";
import type { AppConfig } from "../AppConfig";

export const pageWithConfig = <P extends object>(
  PageComponent: ComponentType<P & { config: AppConfig }>,
  pageName?: string
) => {
  const PageWithConfig = async (props: P) => {
    // Hard stop on missing configuration:
    const config = await getAppConfig();
    if (!config) {
      return notFound();
    }

    // Retrieve the page name from the component's displayName or name
    const pageToCheck =
      pageName === undefined
        ? PageComponent.displayName || PageComponent.name
        : pageName;

    // Check a specific feature flag for the page
    // "*" means allowed by default
    if (pageToCheck && pageToCheck !== "*") {
      const flags = config.featureFlags.pages;
      const featureBase = pageToCheck.split(":")[0];
      const hasFeature =
        flags.includes(pageToCheck) ||
        flags.includes(`${featureBase}:*`) ||
        flags.includes("*");
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
