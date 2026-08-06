import { Bell, Share2, User, Users } from "lucide-react";

import type { TAppConfigItem } from "@/AppConfig";
import { QuickShareHomePage } from "@/config/quickshare/home-page";
import { QuickShareAccountPreferences } from "@/config/quickshare/components/QuickShareAccountPreferences";
import { QuickShareApiAccessPreferences } from "@/config/quickshare/components/QuickShareApiAccessPreferences";

export default {
  name: "QuickShare",
  match: {
    url: ["^quickshare\\.42go\\.dev$"],
  },
  features: [
    "page:quickshare",
    "page:users",
    "page:notifications",
    "api:quickshare",
    "api:profile",
    "api:users",
    "api:notifications",
  ],
  auth: {
    providers: [{ type: "credentials" as const, config: {} }],
  },
  theme: { default: "system" },
  public: {
    toolbar: {
      title: "QuickShare",
      subtitle: "Publish on your terms",
      href: "/",
      actions: [
        {
          type: "link",
          label: "Sign in",
          href: "/login",
          variant: "default",
          size: "sm",
        },
      ],
    },
    meta: {
      title: "QuickShare",
      description: "Create, publish, and control your shared information.",
    },
    pages: {
      HomePage: QuickShareHomePage,
    },
  },
  app: {
    default: { page: "/quickshare" },
    profile: {
      items: [
        { type: "AccountInfo" },
        { type: "component", component: QuickShareAccountPreferences },
        { type: "component", component: QuickShareApiAccessPreferences },
        { type: "Logout" },
      ],
    },
    menu: {
      top: {
        items: [{ title: "Shares", href: "/quickshare", icon: Share2 }],
      },
      bottom: {
        items: [
          {
            title: "Users",
            href: "/backoffice/users",
            icon: Users,
            policy: {
              require: {
                feature: "page:users",
                session: true,
                role: "backoffice",
                grants: ["users:list"],
              },
            },
          },
          {
            title: "Notifications",
            href: "/backoffice/notifications",
            icon: Bell,
            policy: {
              require: {
                feature: "page:notifications",
                session: true,
                role: "backoffice",
                grants: ["notifications:list"],
              },
            },
          },
        ],
      },
      mobile: {
        disableMore: true,
        items: [
          { title: "Shares", href: "/quickshare", icon: Share2 },
          { title: "Account", href: "/profile", icon: User },
        ],
      },
      collapsible: { position: "bottom" },
    },
  },
} as const satisfies TAppConfigItem;
