import type { ComponentType } from "react";

export const APP_ICON_ASSET_FILENAMES = {
  faviconIco: "favicon.ico",
  favicon16: "favicon-16x16.png",
  favicon32: "favicon-32x32.png",
  appleTouch180: "apple-touch-icon-180x180.png",
  manifest192: "manifest-192x192.png",
  manifest512: "manifest-512x512.png",
  maskable512: "maskable-512x512.png",
  ui: "ui.png",
} as const;

export type TAppIconAssetKey = keyof typeof APP_ICON_ASSET_FILENAMES;

export type TAppIconComponent = ComponentType<{ className?: string }>;

export type TAppIconSource = string | TAppIconComponent;

export type TAppIconsConfig = {
  /**
   * Public path used for convention lookups.
   * Defaults to `/app-icons/<app-id>`.
   */
  basePath?: string;
  /**
   * If true, validation must fail when this app misses app-specific assets.
   */
  strict?: boolean;
  favicon?: {
    ico?: string;
    png16?: string;
    png32?: string;
  };
  appleTouch180?: string;
  manifest192?: string;
  manifest512?: string;
  maskable512?: string;
  ui?: TAppIconSource;
};

export type TResolvedAppIcons = {
  faviconIco: string;
  favicon16: string;
  favicon32: string;
  appleTouch180: string;
  manifest192: string;
  manifest512: string;
  maskable512: string;
  ui: TAppIconSource;
};
