import type { TAppConfig, TAppID } from "@/AppConfig";
import { APP_ICON_REGISTRY } from "@/42go/icons/app-icons.registry";
import {
  APP_ICON_ASSET_FILENAMES,
  type TAppIconAssetKey,
  type TResolvedAppIcons,
} from "@/42go/icons/types";

export const DEFAULT_APP_ICON_BASE_PATH = "/app-icons/_default";
export const APP_ICON_BASE_PATH = "/app-icons";

const normalizePublicPath = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

const joinPublicPath = (basePath: string, filename: string) =>
  `${normalizePublicPath(basePath).replace(/\/+$/, "")}/${filename}`;

const getRegistryKeyFromBasePath = (basePath: string) => {
  const normalized = normalizePublicPath(basePath).replace(/\/+$/, "");
  const prefix = `${APP_ICON_BASE_PATH}/`;

  if (!normalized.startsWith(prefix)) return null;

  return normalized.slice(prefix.length) || null;
};

const hasRegisteredAsset = (basePath: string, assetKey: TAppIconAssetKey) => {
  const registryKey = getRegistryKeyFromBasePath(basePath);
  if (!registryKey) return true;

  const registry = APP_ICON_REGISTRY as Record<
    string,
    Partial<Record<TAppIconAssetKey, true>>
  >;

  return Boolean(registry[registryKey]?.[assetKey]);
};

const getConventionBasePath = (appId: TAppID, config: TAppConfig) => {
  if (config?.icons?.basePath) return normalizePublicPath(config.icons.basePath);
  if (appId) return `${APP_ICON_BASE_PATH}/${appId}`;

  return DEFAULT_APP_ICON_BASE_PATH;
};

const getDefaultHref = (assetKey: TAppIconAssetKey) =>
  joinPublicPath(DEFAULT_APP_ICON_BASE_PATH, APP_ICON_ASSET_FILENAMES[assetKey]);

const getConventionHref = (
  appId: TAppID,
  config: TAppConfig,
  assetKey: TAppIconAssetKey,
) => {
  const basePath = getConventionBasePath(appId, config);

  if (!hasRegisteredAsset(basePath, assetKey)) return null;

  return joinPublicPath(basePath, APP_ICON_ASSET_FILENAMES[assetKey]);
};

const resolveIconHref = (
  appId: TAppID,
  config: TAppConfig,
  assetKey: TAppIconAssetKey,
  explicitHref?: string,
) => {
  if (explicitHref) return explicitHref;

  return getConventionHref(appId, config, assetKey) ?? getDefaultHref(assetKey);
};

export const resolveAppIcons = (
  appId: TAppID,
  config: TAppConfig,
): TResolvedAppIcons => {
  const iconConfig = config?.icons;

  return {
    faviconIco: resolveIconHref(
      appId,
      config,
      "faviconIco",
      iconConfig?.favicon?.ico,
    ),
    favicon16: resolveIconHref(
      appId,
      config,
      "favicon16",
      iconConfig?.favicon?.png16,
    ),
    favicon32: resolveIconHref(
      appId,
      config,
      "favicon32",
      iconConfig?.favicon?.png32,
    ),
    appleTouch180: resolveIconHref(
      appId,
      config,
      "appleTouch180",
      iconConfig?.appleTouch180,
    ),
    manifest192: resolveIconHref(
      appId,
      config,
      "manifest192",
      iconConfig?.manifest192,
    ),
    manifest512: resolveIconHref(
      appId,
      config,
      "manifest512",
      iconConfig?.manifest512,
    ),
    maskable512: resolveIconHref(
      appId,
      config,
      "maskable512",
      iconConfig?.maskable512,
    ),
    ui:
      iconConfig?.ui ?? resolveIconHref(appId, config, "ui", undefined),
  };
};

export const resolveAppTitleIcon = (appId: TAppID, config: TAppConfig) =>
  config?.public?.toolbar?.icon ?? resolveAppIcons(appId, config).ui;
