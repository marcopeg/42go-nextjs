import type { Metadata } from "next";

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
};

export type TPublicMeta = Partial<Metadata>;
