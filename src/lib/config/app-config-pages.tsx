import { notFound } from "next/navigation";
import { headers } from "next/headers";
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
      notFound();
    }

    const availableFlags = config.featureFlags.pages;

    // page-level override (*) or global wildcard
    if (requiredFlags === "*" || availableFlags.includes("*")) {
      return <PageComponent {...props} />;
    }

    // specific flag check
    let flagsToCheck: string;

    if (requiredFlags === "url!") {
      // Calculate flagsToCheck from current URL using middleware-set header
      const headersList = await headers();
      const pathname =
        headersList.get("x-pathname") || headersList.get("x-url") || "/";

      // Extract path segments and convert to configKey format
      // /foo/bar -> "foo/bar"
      const pathSegments = pathname
        .replace(/^\//, "")
        .split("/")
        .filter(Boolean);
      flagsToCheck = pathSegments.join("/").toLowerCase() || "HomePage";
    } else {
      // Use provided flags or component name as fallback
      flagsToCheck =
        requiredFlags ??
        PageComponent.displayName ??
        PageComponent.name ??
        "Page";
    }

    const flagBase = flagsToCheck.split(":")[0];
    const hasFeature =
      availableFlags.includes(flagsToCheck) ||
      availableFlags.includes(`${flagBase}:*`);
    if (!hasFeature) {
      notFound();
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
    notFound();
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
    notFound();
  }

  return render(config);
}
