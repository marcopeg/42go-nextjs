import { TAppConfigItem } from "../../AppConfig";

import { User, ListChecks } from "lucide-react";

export default {
  name: "quicklist",
  match: {
    url: ["^quicklist\\.localhost:\\d+$", "^42go.ngrok.app+$"],
  },
  features: ["api:waitlist", "api:quicklists", "page:quicklists"],
  auth: {
    providers: [
      {
        type: "credentials" as const,
        config: {},
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
  public: {
    toolbar: {
      disabled: true,
    },
    footer: {
      disabled: true,
    },
    pages: {
      HomePage: {
        items: [
          {
            type: "hero",
            title: "Quick**List**",
            subtitle: "todos, **made simple**",
            actions: [
              {
                href: "/login",
                label: "Go!",
                style: "primary",
              },
            ],
          },
          // {
          //   type: "waitlist",
          //   title: "Join the **Waitlist**",
          //   subtitle: "Get early access. **No spam.**",
          //   placeholder: "Your email address",
          //   buttonLabel: "Join Now",
          //   feedback: {
          //     type: "message",
          //     content: "You're on the list!",
          //   },
          // },
        ],
      },
    },
    pwa: {
      name: "QuickList",
      shortName: "QuickList",
      themeColor: "dark",
      backgroundColor: "dark",
      startUrl: "/quicklists",
      scope: "/",
      display: "standalone",
      icons: {
        appleTouch180: "/images/icons/quicklist-180.png",
      },
    },
  },
  app: {
    default: {
      page: "/quicklists",
    },
    menu: {
      top: {
        items: [
          {
            title: "Projects",
            href: "/quicklists",
            icon: ListChecks,
          },
        ],
      },
      mobile: {
        disableMore: true,
        items: [
          {
            title: "Projects",
            href: "/quicklists",
            icon: ListChecks,
          },
          {
            title: "Account",
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
} as const satisfies TAppConfigItem;
