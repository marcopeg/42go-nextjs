import { TAppConfigItem } from "../../AppConfig";

import { HomePage } from "@/config/home-page";
import { AboutPage } from "@/config/about-page";
import { PricingPage } from "@/config/pricing-page";

export default {
  name: "APP n2",
  match: {
    url: ["^app2\\.localhost:\\d+$"],
  },
  features: ["page:todos", "page:about", "api:todos:write"],
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
} as const satisfies TAppConfigItem;
