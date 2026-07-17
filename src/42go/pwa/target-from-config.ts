import type { TAppConfig, TAppID } from "@/AppConfig";
import { resolveAppIcons } from "@/42go/icons";
import { resolvePWAColor, type TColorInput } from "@/42go/pwa/colors";
import type {
  TPWAInstallIcons,
  TPWAInstallTargetOverrides,
  TPWAResolvedInstallTarget,
} from "@/42go/pwa/types";
import { validatePWAInstallTarget } from "@/42go/pwa/validation";

const toPWAIcons = (
  icons: ReturnType<typeof resolveAppIcons>
): TPWAInstallIcons => ({
  faviconIco: icons.faviconIco,
  favicon16: icons.favicon16,
  favicon32: icons.favicon32,
  appleTouch180: icons.appleTouch180,
  manifest192: icons.manifest192,
  manifest512: icons.manifest512,
  maskable512: icons.maskable512,
});

export const resolveBasePWAInstallTarget = (
  appId: TAppID,
  config: TAppConfig
): TPWAResolvedInstallTarget => {
  const pwa = config?.public?.pwa;
  const name = pwa?.name || config?.name || "App";
  const startUrl = pwa?.startUrl || "/";

  return validatePWAInstallTarget({
    id: pwa?.id || startUrl,
    name,
    shortName: pwa?.shortName || name,
    description: pwa?.description,
    themeColor:
      resolvePWAColor(pwa?.themeColor as TColorInput | undefined) || "#000000",
    backgroundColor:
      resolvePWAColor(pwa?.backgroundColor as TColorInput | undefined) ||
      "#ffffff",
    statusBarStyle: pwa?.statusBarStyle || "default",
    display: pwa?.display || "standalone",
    scope: pwa?.scope || "/",
    startUrl,
    manifestPath: null,
    icons: toPWAIcons(resolveAppIcons(appId, config)),
    private: false,
  });
};

export const mergePWAInstallTarget = ({
  base,
  overrides,
}: {
  base: TPWAResolvedInstallTarget;
  overrides: TPWAInstallTargetOverrides;
}): TPWAResolvedInstallTarget =>
  validatePWAInstallTarget({
    ...base,
    ...overrides,
    shortName: overrides.shortName || overrides.name,
    themeColor:
      resolvePWAColor(overrides.themeColor as TColorInput | undefined) ||
      base.themeColor,
    backgroundColor:
      resolvePWAColor(overrides.backgroundColor as TColorInput | undefined) ||
      base.backgroundColor,
    statusBarStyle: overrides.statusBarStyle || base.statusBarStyle,
    display: overrides.display || base.display,
    scope: overrides.scope || base.scope,
    startUrl: overrides.startUrl || base.startUrl,
    manifestPath: overrides.manifestPath || overrides.startUrl || base.startUrl,
    icons: {
      ...base.icons,
      ...overrides.icons,
    },
    private: overrides.private ?? true,
  });
