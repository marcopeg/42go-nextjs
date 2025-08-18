import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
// Types for composing the AppConfig
import type { TAuthProviders } from "@/42go/auth/lib/providers/types";
import type { TDynamicPage } from "@/42go/components/DynamicPage";
import type { TPublicLayoutToolbar } from "@/42go/layouts/public/types";
import type { TAppLayoutNavItem } from "@/42go/layouts/app/types";
import type { TAppConfigMatch } from "@/42go/lib/app-id/matchers";

// Import different apps
import DefaultApp from "./config/default/config";
import App1App from "./config/app1/config";
import App2App from "./config/app2/config";
import CalendarApp from "./config/calendar/config";
import QuicklistApp from "./config/quicklist/config";

// This should be moved into 42go somewhere
export type ThemeValue = "light" | "dark" | "system";

export interface TAppConfigItem {
  name: string;
  logo?: string | ComponentType<{ className?: string }>;
  // meta moved to public.meta
  theme?: {
    default?: ThemeValue;
    PublicLayout?: ComponentType<{ children: ReactNode }>;
  };
  public?: {
    toolbar?: TPublicLayoutToolbar;
    meta?: Partial<Metadata>;
    pages?: TDynamicPage; // CMS pages configuration
    docs?: {
      source?: string; // Path to the documentation source
      cache?: {
        duration?: number; // Cache duration in ms (-1 for no cache, 0 for no expiration, >0 for specific duration)
      };
    };
  };
  auth?: {
    providers: TAuthProviders;
    logout?: {
      /** Optional redirect URL after sign out; defaults to "/" */
      url?: string;
    };
  };
  app?: {
    /** App-level defaults */
    default?: {
      /** Default page to land on after login (root-relative path). */
      page?: string;
    };
    menu?: {
      /**
       * Controls where the desktop sidebar collapse button appears.
       * Defaults to "top" when omitted.
       */
      collapsible?: {
        position?: "top" | "bottom";
      };
      top?: {
        items?: TAppLayoutNavItem[];
      };
      bottom?: {
        items?: TAppLayoutNavItem[];
      };
      mobile?: {
        items?: TAppLayoutNavItem[];
      };
    };
  };
  /**
   * Unified feature flags list.
   * MUST use prefixes: `page:` or `api:`.
   */
  features: readonly string[];
  match?: TAppConfigMatch;
  // pages moved to public.pages
  // docs moved to public.docs
}

export type TAppConfig = TAppConfigItem | null;
export type TAppID = keyof typeof apps | null;

/**
 * Default application name.
 * This is used when no specific app is identified.
 *
 * If set to null and no app is identified,
 * the application will return a 404.
 */
export const DEFAULT_APP: TAppID = null;

/**
 * Available applications with their configurations.
 */
export const apps = {
  default: DefaultApp,
  app1: App1App,
  app2: App2App,
  calendar: CalendarApp,
  quicklist: QuicklistApp,
} as const satisfies Record<string, TAppConfigItem>;

// Helper derived type including optional features on each app entry
export type AppsMap = typeof apps;
