import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
// Types for composing the AppConfig
import type { TAuthProviders } from "@/42go/auth/lib/providers/types";
import type { TDynamicPage } from "@/42go/components/DynamicPage";
import type { TPublicLayoutToolbar } from "@/42go/layouts/public/types";
import type { TAppLayoutNavItem } from "@/42go/layouts/app/types";
import type { TAppConfigMatch } from "@/42go/lib/match/matchers";
// Into the default's public toolbar
import { UserMenu } from "@/42go/auth/components/UserMenu";
// Develompent utilities for the pages
import { HomePage } from "@/config/home-page";
import { AboutPage } from "@/config/about-page";
import { PricingPage } from "@/config/pricing-page";

// Icons user in links
import {
  Zap,
  CheckSquare,
  CalendarCheck,
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  BarChart3,
  Home,
  User,
} from "lucide-react";

// This should be moved into 42go somewhere
export type ThemeValue = "light" | "dark" | "system";

export interface AppConfigItem {
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
  };
  app?: {
    menu?: {
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
  featureFlags: {
    pages: string[]; // List of pages available in this app
    apis: string[]; // List of API endpoints available in this app
  };
  match?: TAppConfigMatch;
  // pages moved to public.pages
  // docs moved to public.docs
}

export type AppConfig = AppConfigItem | null;
export type AppName = keyof typeof apps | null;

// Removed: APP_HEADER_NAME is now internal to the 42go library

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
export const apps: Record<string, AppConfigItem> = {
  default: {
    name: "DEFAULT APP",
    match: {
      url: ["^localhost:3000$"],
      header: {
        mode: "all",
        keys: [
          { key: "foo", value: "bar" },
          { key: "faa", value: "bar" },
        ],
      },
    },
    featureFlags: {
      pages: ["docs", "todos"],
      apis: ["waitlist", "feedback", "todos"],
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
        title: "NextKit",
        subtitle: "Build SaaS in minutes",
        icon: Zap,
        // href: "/", // this is the default value
        actions: [
          {
            type: "link",
            label: "Docs",
            href: "/docs",
            variant: "link",
          },
          { type: "component", component: UserMenu },
        ],
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
    app: {
      menu: {
        top: {
          items: [
            {
              title: "Dashboard",
              href: "/dashboard",
              icon: LayoutDashboard,
            },
            {
              title: "Analytics",
              href: "/analytics",
              icon: BarChart3,
              badge: "Pro",
            },
            {
              title: "Users",
              href: "/users",
              icon: Users,
            },
            {
              title: "Documents",
              href: "/documents",
              icon: FileText,
            },
          ],
        },
        bottom: {
          items: [
            {
              title: "Home",
              href: "/",
              icon: Home,
            },
            {
              title: "Settings",
              href: "/settings",
              icon: Settings,
            },
          ],
        },
        mobile: {
          items: [
            {
              title: "Home",
              href: "/dashboard",
              icon: Home,
            },
            {
              title: "Analytics",
              href: "/analytics",
              icon: BarChart3,
            },
            {
              title: "Users",
              href: "/users",
              icon: Users,
            },
            {
              title: "Profile",
              href: "/profile",
              icon: User,
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
      header: {
        keys: [
          { key: "Authorization", value: "/^Bearer .+app1-api-key.+$/" },
          { key: "X-App-Type", value: "app1" },
        ],
      },
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
        // actions: [
        //   {
        //     label: "Join Us!",
        //     href: "/login",
        //     style: "primary",
        //     sticky: true,
        //   },
        //   {
        //     label: "Pricing",
        //     href: "/pricing",
        //     style: "ghost",
        //     sticky: false,
        //   },
        // ],
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
        // actions: [
        //   {
        //     label: "Dashboard",
        //     href: "/dashboard",
        //     style: "secondary",
        //     sticky: true,
        //   },
        //   {
        //     label: "About",
        //     href: "/about",
        //     style: "ghost",
        //     sticky: false,
        //   },
        // ],
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
      header: {
        keys: [
          { key: "X-App-Type", value: "calendar" },
          { key: "X-App-Type", value: "scheduling" },
          { key: "/^X-Calendar-.*/i", value: "/^pro-/" },
        ],
      },
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
        // actions: [
        //   {
        //     label: "Try Now",
        //     href: "/login",
        //     style: "primary",
        //     sticky: true,
        //   },
        //   {
        //     label: "Features",
        //     href: "/features",
        //     style: "ghost",
        //     sticky: false,
        //   },
        // ],
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
};
