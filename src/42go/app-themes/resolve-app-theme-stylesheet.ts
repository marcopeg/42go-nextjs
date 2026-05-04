import type { TAppID } from "@/AppConfig";
import { APP_THEME_STYLESHEET_REGISTRY } from "@/42go/app-themes/app-themes.registry";
import type { TResolvedAppThemeStylesheet } from "@/42go/app-themes/types";

export const APP_THEME_STYLESHEET_FILENAME = "style.css";
export const APP_THEME_STYLESHEET_BASE_PATH = "/app-themes";
export const DEFAULT_APP_THEME_STYLESHEET_HREF = `${APP_THEME_STYLESHEET_BASE_PATH}/_default/${APP_THEME_STYLESHEET_FILENAME}`;

const hasRegisteredAppThemeStylesheet = (appId: TAppID) => {
  if (!appId) return false;

  return Boolean(
    (APP_THEME_STYLESHEET_REGISTRY as Record<string, true | undefined>)[appId],
  );
};

export const resolveAppThemeStylesheet = (
  appId: TAppID,
): TResolvedAppThemeStylesheet => {
  const resolved: TResolvedAppThemeStylesheet = {
    defaultHref: DEFAULT_APP_THEME_STYLESHEET_HREF,
  };

  if (!hasRegisteredAppThemeStylesheet(appId)) return resolved;

  return {
    ...resolved,
    appHref: `${APP_THEME_STYLESHEET_BASE_PATH}/${appId}/${APP_THEME_STYLESHEET_FILENAME}`,
  };
};
