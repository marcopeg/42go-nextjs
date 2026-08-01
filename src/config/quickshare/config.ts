import { User, Share2 } from "lucide-react";

import type { TAppConfigItem } from "@/AppConfig";
import { QuickShareHomePage } from "@/config/quickshare/home-page";
import { QuickShareAccountPreferences } from "@/lib/quickshare/components/QuickShareAccountPreferences";
import { QuickShareApiAccessPreferences } from "@/lib/quickshare/components/QuickShareApiAccessPreferences";

export default {
  name: "QuickShare",
  match: {
    url: ["^quickshare\\.42go\\.dev$"],
  },
  features: ["page:quickshare", "api:quickshare", "api:profile"],
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
