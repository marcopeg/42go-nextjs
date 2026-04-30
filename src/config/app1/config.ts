import { TAppConfigItem } from "../../AppConfig";
import { CheckSquare, User } from "lucide-react";

import { HomePage } from "@/config/home-page";
import { AboutPage } from "@/config/about-page";
import { PricingPage } from "@/config/pricing-page";

export default {
  name: "APP n1",
  match: {
    url: ["^app1\\.localhost:\\d+$"],
    header: {
      keys: [
        { key: "Authorization", value: "/^Bearer .+app1-api-key.+$/" },
        { key: "X-App-Type", value: "app1" },
      ],
    },
  },
  features: ["page:docs", "api:getTodos", "api:waitlist", "api:feedback"],
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
  app: {
    menu: {
      mobile: {
        disableMore: true,
        items: [
          {
            title: "Account",
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
          clientId: process.env.APP1_GITHUB_CLIENT_ID!,
          clientSecret: process.env.APP1_GITHUB_CLIENT_SECRET!,
        },
      },
    ],
    logout: {
      url: "/",
    },
  },
} as const satisfies TAppConfigItem;
