import type { NextRequest } from "next/server";
import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import type { AuthProviderArray } from "@/lib/auth/providers/types";
import type { Pages } from "@/42go/components/pages";
import { HomePage } from "@/config/home-page";
import { AboutPage } from "./config/about-page";
import { PricingPage } from "./config/pricing-page";
import { Zap, CheckSquare, CalendarCheck } from "lucide-react";

// import { App1PublicLayout } from "@/components/App1PublicLayout";

export type ThemeValue = "light" | "dark" | "system";

export interface ToolbarConfig {
  title?: string;
  subtitle?: string;
  icon?: string | ComponentType<{ className?: string }>;
  href?: string;
}

export interface AppConfigItem {
  name: string;
  logo?: string | ComponentType<{ className?: string }>;
  // meta moved to public.meta
  theme?: {
    default?: ThemeValue;
    PublicLayout?: ComponentType<{ children: ReactNode }>;
  };
  public?: {
    toolbar?: ToolbarConfig;
    meta?: Partial<Metadata>;
    pages?: Pages; // CMS pages configuration
    docs?: {
      source?: string; // Path to the documentation source
      cache?: {
        duration?: number; // Cache duration in ms (-1 for no cache, 0 for no expiration, >0 for specific duration)
      };
    };
  };
  auth?: {
    providers: AuthProviderArray;
  };
  featureFlags: {
    pages: string[]; // List of pages available in this app
    apis: string[]; // List of API endpoints available in this app
  };
  match?: {
    url?: string | string[]; // Regexp string(s) to match host
  };
  // pages moved to public.pages
  // docs moved to public.docs
}

export type AppConfig = AppConfigItem | null;
export type AppName = keyof typeof availableApps | null;

/**
 * Header name for app identification
 * (this might become an ENV variable in the future)
 */
export const APP_HEADER_NAME = "X-App-Name";

/**
 * Default application name.
 * This is used when no specific app is identified.
 *
 * If set to null and no app is identified,
 * the application will return a 404.
 */
export const DEFAULT_APP: AppName = null;

/**
 * Available applications with their configurations.
 */
export const availableApps = {
  default: {
    name: "DEFAULT APP",
    match: {
      url: ["^localhost:3000$"],
    },
    featureFlags: {
      pages: ["*"],
      apis: ["*"],
    },
    theme: {
      default: "system",
    },
    public: {
      meta: {
        title: "Default App - Chuck Norris Edition",
        description:
          "The default application that's tougher than a two-dollar steak",
        keywords: ["nextjs", "default", "chuck-norris", "legendary"],
        authors: [{ name: "Chuck Norris" }],
      },
      toolbar: {
        title: "Chuck Norris Edition",
        subtitle: "Tougher than a two-dollar steak",
        icon: Zap,
        // href: "/", // this is the default value
      },
      pages: {
        HomePage,
        about: AboutPage,
        pricing: PricingPage,
      },
      docs: {
        source: "./contents/default/docs",
        cache: {
          duration: -1, // No expiration
        },
      },
    },
    auth: {
      providers: [
        {
          type: "credentials" as const,
          config: {},
        },
        {
          type: "github" as const,
          config: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          },
        },
        {
          type: "google" as const,
          config: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        },
      ],
    },
  },
  app1: {
    name: "APP n1",
    match: {
      url: ["^app1\\.localhost:3000$", "^app1\\.mydomain.com$"],
    },
    featureFlags: {
      pages: ["todos", "docs"],
      apis: ["getTodos"],
    },
    theme: {
      default: "dark",
      // PublicLayout: App1PublicLayout,
    },
    public: {
      meta: {
        title: "App1 - Todo Master",
        description:
          "The ultimate todo application that gets things done faster than Chuck Norris kicks",
        keywords: ["todos", "productivity", "app1", "tasks"],
        authors: [{ name: "Chuck Norris", url: "https://chucknorris.com" }],
      },
      toolbar: {
        title: "Todo Master",
        subtitle: "Get things done faster",
        icon: CheckSquare,
        href: "/",
      },
      pages: {
        HomePage,
        about: AboutPage,
        pricing: PricingPage,
      },
      docs: {
        source: "/Users/marcopeg/dv/marcopeg/42go-next/docs/articles/default",
      },
    },
    auth: {
      providers: [
        {
          type: "credentials" as const,
          config: {},
        },
        {
          type: "github" as const,
          config: {
            clientId: process.env.APP1_GITHUB_CLIENT_ID!,
            clientSecret: process.env.APP1_GITHUB_CLIENT_SECRET!,
          },
        },
      ],
    },
  },
  app2: {
    name: "APP n2",
    match: {
      url: ["^app2\\.localhost:3000$", "^app2\\.mydomain.com$"],
    },
    featureFlags: {
      pages: ["todos", "about"],
      apis: ["todos:write"],
    },
    theme: {
      default: "light",
    },
    public: {
      meta: {
        title: "App2 - Write Operations",
        description:
          "Specialized app for write operations, as powerful as Chuck Norris's beard",
        keywords: ["write", "operations", "app2", "api"],
        authors: [{ name: "Chuck Norris Team" }],
      },
      toolbar: {
        title: "", // Empty title to test fallback to app name
        subtitle: "Write Operations",
      },
      pages: {
        HomePage,
        about: AboutPage,
        pricing: PricingPage,
      },
    },
    auth: {
      providers: [
        {
          type: "google" as const,
          config: {
            clientId: process.env.APP2_GOOGLE_CLIENT_ID!,
            clientSecret: process.env.APP2_GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        },
      ],
    },
  },
  calendar: {
    name: "CalendarPro",
    match: {
      url: ["^calendar\\.localhost:3000$", "^calendar\\.mydomain.com$"],
    },
    featureFlags: {
      pages: ["CalendarPage"],
      apis: [""],
    },
    theme: {
      default: "light",
    },
    public: {
      meta: {
        title: "Calendar Pro - Schedule Like a Pro",
        description:
          "Professional calendar application that organizes your time with the precision of Chuck Norris's timing",
        keywords: [
          "calendar",
          "scheduling",
          "productivity",
          "time-management",
          "events",
        ],
        authors: [{ name: "Calendar Pro Team" }],
      },
      toolbar: {
        title: "Calendar Pro",
        subtitle: "Schedule Like a Pro",
        icon: CalendarCheck,
        href: "/",
      },
      pages: {
        HomePage: {
          items: [
            {
              type: "hero",
              title: "**Welcome to Calendar Pro**",
              subtitle: "keep track of your time like Chuck Norris",
              actions: [
                {
                  label: "Try it Now",
                  href: "/login",
                  style: "primary",
                },
              ],
            },
          ],
        },
        terms: {
          items: [
            {
              type: "markdown",
              path: "./contents/calendar/terms.md",
            },
          ],
        },
      },
    },
    auth: {
      providers: [
        {
          type: "credentials" as const,
          config: {},
        },
      ],
    },
  },
} satisfies Record<string, AppConfigItem>;

/**
 * Dynamically determines the app name based on request headers or URL.
 * (used in middleware and other parts of the application)
 *
 * @param request NextRequest object from Next.js
 * @returns
 */
export const matchAppName = async (request: NextRequest): Promise<AppName> => {
  // Identify by header
  const customSetupHeader = request.headers.get(APP_HEADER_NAME);
  if (
    customSetupHeader &&
    customSetupHeader !== "null" &&
    availableApps[customSetupHeader as keyof typeof availableApps]
  ) {
    return customSetupHeader as AppName;
  }

  // Match by Host Header
  // config.match.url
  const hostHeader = request.headers.get("host");
  for (const [appKey, appConfig] of Object.entries(availableApps)) {
    if (appConfig.match?.url) {
      const urlPatterns = Array.isArray(appConfig.match.url)
        ? appConfig.match.url
        : [appConfig.match.url];
      for (const pattern of urlPatterns) {
        try {
          const regex = new RegExp(pattern);
          if (hostHeader && regex.test(hostHeader)) {
            return appKey as AppName; // First positive match exits like Chuck Norris
          }
        } catch {
          // Chuck Norris doesn't catch errors, but TypeScript does
        }
      }
    }
  }

  // Unknown host - return null to trigger 404
  return null;
};
