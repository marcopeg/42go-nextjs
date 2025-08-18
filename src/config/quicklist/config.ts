import { TAppConfigItem } from "../../AppConfig";
import QuicklistIcon from "./QuicklistIcon";
import { UserMenu } from "@/42go/auth/components/UserMenu";

import { LayoutDashboard, ListChecks } from "lucide-react";

export default {
  name: "quicklist",
  match: {
    url: ["^quicklist\\.localhost:\\d+$"],
  },
  features: ["api:waitlist", "api:quicklists", "page:quicklists"],
  auth: {
    providers: [
      {
        type: "credentials" as const,
        config: {},
      },
    ],
  },
  public: {
    toolbar: {
      title: "QuickList",
      icon: QuicklistIcon,
      actions: [{ type: "component", component: UserMenu }],
    },
    pages: {
      HomePage: {
        items: [
          {
            type: "hero",
            title: "Quick**List**",
            subtitle: "The fastest way through your grocery duties",
          },
          {
            type: "waitlist",
            title: "Join the **Waitlist**",
            subtitle: "Get early access. **No spam.**",
            placeholder: "Your email address",
            buttonLabel: "Join Now",
            feedback: {
              type: "message",
              content: "You're on the list!",
            },
          },
        ],
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
            title: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
          },
          {
            title: "Projects",
            href: "/quicklists",
            icon: ListChecks,
            policy: {
              require: { feature: "page:quicklists" },
            },
          },
        ],
      },
      collapsible: {
        position: "bottom",
      },
    },
  },
} as const satisfies TAppConfigItem;
