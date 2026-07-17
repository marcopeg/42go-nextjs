import type { Metadata } from "next";

export type TPWAInstallTargetDeclaration = {
  /**
   * Root-relative path pattern using literal segments, `:param` segments, and
   * an optional trailing `/**` wildcard.
   */
  pattern: string;
  /** Server-only resolver key registered in `src/PWAInstallTargets.ts`. */
  resolver: string;
  /**
   * Optional stable path template for manifest requests. Parameters use the
   * same `:param` names as pattern. Defaults to the current matched pathname.
   */
  manifestPath?: string;
};

export type TPWAInstallIcons = {
  faviconIco: string;
  favicon16: string;
  favicon32: string;
  appleTouch180: string;
  manifest192: string;
  manifest512: string;
  maskable512: string;
};

export type TPWAConfig = {
  /** Stable manifest identity. Defaults to startUrl for backward compatibility. */
  id?: string;
  name: string;
  shortName?: string;
  description?: string;
  themeColor?: string;
  backgroundColor?: string;
  statusBarStyle?: "default" | "black" | "black-translucent";
  display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  scope?: string;
  startUrl?: string;
  targets?: readonly TPWAInstallTargetDeclaration[];
};

export type TPWAInstallTargetResolverContext = {
  appId: string;
  pathname: string;
  params: Readonly<Record<string, string>>;
};

export type TPWAInstallTargetOverrides = Partial<
  Omit<TPWAConfig, "id" | "name" | "targets">
> & {
  id: string;
  name: string;
  /** Stable path used to resolve the same target from the manifest request. */
  manifestPath?: string;
  icons?: Partial<TPWAInstallIcons>;
  private?: boolean;
};

export type TPWAInstallTargetResolver = (
  context: TPWAInstallTargetResolverContext
) => Promise<TPWAInstallTargetOverrides | null>;

export type TPWAResolvedInstallTarget = {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  themeColor: string;
  backgroundColor: string;
  statusBarStyle: "default" | "black" | "black-translucent";
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  scope: string;
  startUrl: string;
  manifestPath: string | null;
  icons: TPWAInstallIcons;
  private: boolean;
};

export type TPWAInstallResolution = {
  target: TPWAResolvedInstallTarget;
  source: "app" | "override";
};

export type TPublicMeta = Partial<Metadata>;
