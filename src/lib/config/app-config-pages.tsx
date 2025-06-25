import { redirect } from "next/navigation";
import { getAppConfig } from "./app-config";
import { type AppConfigItem as AppConfig } from "@/AppConfig";
export type { AppConfig };

export function appPage<P extends object>(
  PageComponent: React.ComponentType<P>,
  requiredFlags?: string
) {
  const AppPageWrapper = async (props: P) => {
    const config = await getAppConfig();
    if (!config) {
      redirect("/not-found");
    }

    const availableFlags = config.featureFlags.pages;

    // page-level override (*) or global wildcard
    if (requiredFlags === "*" || availableFlags.includes("*")) {
      return <PageComponent {...props} />;
    }

    // specific flag check
    const flagsToCheck =
      requiredFlags ??
      PageComponent.displayName ??
      PageComponent.name ??
      "Page";
    const flagBase = flagsToCheck.split(":")[0];
    const hasFeature =
      availableFlags.includes(flagsToCheck) ||
      availableFlags.includes(`${flagBase}:*`);
    if (!hasFeature) {
      redirect("/not-found");
    }

    return <PageComponent {...props} />;
  };

  const displayName =
    PageComponent.displayName || PageComponent.name || "Component";
  AppPageWrapper.displayName = `appPage(${displayName})`;

  return AppPageWrapper;
}

export async function pageWithConfig(
  render: (config: AppConfig) => React.ReactNode,
  requiredFlags?: string
) {
  const config = await getAppConfig();
  if (!config) {
    redirect("/not-found");
  }

  const availableFlags = config.featureFlags.pages;

  // page-level override (*) or global wildcard
  if (requiredFlags === "*" || availableFlags.includes("*")) {
    return render(config);
  }

  // specific flag check
  const flagsToCheck = requiredFlags ?? render.name ?? "Page";
  const flagBase = flagsToCheck.split(":")[0];
  const hasFeature =
    availableFlags.includes(flagsToCheck) ||
    availableFlags.includes(`${flagBase}:*`);
  if (!hasFeature) {
    redirect("/not-found");
  }

  return render(config);
}
