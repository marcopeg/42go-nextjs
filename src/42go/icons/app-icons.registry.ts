import type { TAppIconAssetKey } from "@/42go/icons/types";

export const APP_ICON_REGISTRY = {
  "_default": {
    faviconIco: true,
    favicon16: true,
    favicon32: true,
    appleTouch180: true,
    manifest192: true,
    manifest512: true,
    maskable512: true,
    ui: true,
  },
  "lingocafe": {
    faviconIco: true,
    favicon16: true,
    favicon32: true,
    appleTouch180: true,
    manifest192: true,
    manifest512: true,
    maskable512: true,
    ui: true,
  },
  "quicklist": {
    faviconIco: true,
    favicon16: true,
    favicon32: true,
    appleTouch180: true,
    manifest192: true,
    manifest512: true,
    maskable512: true,
    ui: true,
  },
} as const satisfies Record<string, Partial<Record<TAppIconAssetKey, true>>>;
