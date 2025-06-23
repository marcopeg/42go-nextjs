import { notFound } from "next/navigation";
import { getAppConfig } from "./app-config";
import { type AppConfigItem as AppConfig } from "@/AppConfig";
export type { AppConfig };

export async function pageWithConfig(
  render: (config: AppConfig) => React.ReactNode,
  requiredFlags?: string
) {
  const config = await getAppConfig();
  if (!config) {
    return notFound();
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
    return notFound();
  }

  return render(config);
}
