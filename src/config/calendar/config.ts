import { TAppConfigItem } from "../../AppConfig";
import { CalendarCheck } from "lucide-react";

export default {
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
  features: ["page:CalendarPage"],
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
    logout: {
      url: "/",
    },
  },
} as const satisfies TAppConfigItem;
