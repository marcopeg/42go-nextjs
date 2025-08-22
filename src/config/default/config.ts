import { UserMenu } from "@/42go/auth/components/UserMenu";
import {
  Zap,
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  BarChart3,
  Home,
  User,
} from "lucide-react";
import QuicklistIcon from "@/config/quicklist/QuicklistIcon";
import { TAppConfigItem } from "../../AppConfig";

import { HomePage } from "@/config/home-page";
import { AboutPage } from "@/config/about-page";
import { PricingPage } from "@/config/pricing-page";

export default {
  name: "DEFAULT APP",
  match: {
    url: ["^42go.vercel.app+$", "^localhost:\\d+$"],
    header: {
      mode: "all",
      keys: [
        { key: "foo", value: "bar" },
        { key: "faa", value: "bar" },
      ],
    },
  },
  features: [
    "page:docs",
    "page:todos",
    "api:waitlist",
    "api:feedback",
    "api:todos",
    "api:quicklists",
    "page:quicklists",
  ],
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
        {
          type: "link",
          label: "Stack",
          href: "/stack",
          variant: "link",
        },
        { type: "component", component: UserMenu },
      ],
    },
    pages: {
      HomePage,
      about: AboutPage,
      pricing: PricingPage,
      stack: {
        items: [
          {
            type: "markdown",
            source: "# Stack Demo",
          },
          {
            type: "stack",
            direction: { base: "column", md: "row" },
            spacing: "md",
            items: [
              {
                alignSelf: "center",
                items: [
                  {
                    type: "markdown",
                    source: "Legacy inline block before rich cells.",
                  },
                ],
              },
              {
                items: [
                  {
                    type: "markdown",
                    source: "**Left cell** with _markdown_.",
                  },
                  { type: "cta", action: { href: "/login", label: "Login" } },
                ],
                alignSelf: "start",
                grow: true,
                className: "p-2 border rounded-md",
              },
              {
                items: [
                  {
                    type: "stack",
                    direction: "column",
                    spacing: "sm",
                    items: [
                      { type: "markdown", source: "Nested **A**" },
                      { type: "markdown", source: "Nested **B**" },
                    ],
                  },
                ],
                alignSelf: "center",
                basis: "1/3",
                className: "p-2 bg-muted/30 rounded-md",
              },
              {
                type: "markdown",
                source:
                  "End of inner stack. *Balanced like Chuck Norris on a roundhouse*.",
              },
            ],
          },
        ],
      },
    },
    docs: {
      source: "./contents/default/docs",
      cache: {
        duration: -1, // No expiration
      },
    },
  },
  app: {
    // default: {
    //   page: "/quicklists",
    // },
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
            policy: {
              require: { role: "backoffice" },
            },
          },
          {
            title: "Documents",
            href: "/documents",
            icon: FileText,
            policy: {
              require: { role: "backoffice" },
            },
          },
          {
            title: "Quicklists",
            href: "/quicklists",
            icon: QuicklistIcon,
            policy: {
              require: { feature: "page:quicklists" },
            },
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
            policy: {
              require: { role: "backoffice" },
            },
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
            policy: {
              require: { role: "backoffice" },
            },
          },
          {
            title: "Users",
            href: "/users",
            icon: Users,
            policy: {
              require: { role: "backoffice" },
            },
          },
          {
            title: "Profile",
            href: "/profile",
            icon: User,
          },
        ],
      },
      collapsible: {
        position: "bottom",
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
    // logout: {
    //   url: "/foo",
    // },
  },
} as const satisfies TAppConfigItem;
