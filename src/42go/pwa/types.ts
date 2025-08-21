import type { Metadata } from "next";

export type TPWAIcons = {
  /** iOS home screen icon */
  appleTouch180: string;
  /** Android recommended */
  manifest192?: string;
  /** Android/Desktop recommended */
  manifest512?: string;
  /** Optional maskable icon */
  maskable512?: string;
};

export type TPWAConfig = {
  name: string;
  shortName?: string;
  description?: string;
  themeColor?: string;
  backgroundColor?: string;
  statusBarStyle?: "default" | "black" | "black-translucent";
  display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  scope?: string;
  startUrl?: string;
  icons: TPWAIcons;
};

export type TPublicMeta = Partial<Metadata>;
