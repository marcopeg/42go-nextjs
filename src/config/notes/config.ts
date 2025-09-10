import { TAppConfigItem } from "../../AppConfig";

export default {
  name: "notes",
  match: {
    url: [
      "^notes.42go.dev+$",
      "^notes42go.ngrok.app+$",
      "^notes\\.localhost:\\d+$",
    ],
  },
  features: ["api:notes", "page:notes"],
  auth: {
    providers: [],
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
            title: "Quick**Notes**",
            subtitle: "notes, **made simple** ❤️",
            actions: [
              {
                href: "/notesnew",
                label: "New Note",
                style: "primary",
              },
            ],
          },
        ],
      },
    },
    pwa: {
      name: "Notes",
      shortName: "Notes",
      themeColor: "dark",
      backgroundColor: "dark",
      startUrl: "/",
      scope: "/",
      display: "standalone",
      icons: {
        appleTouch180: "/images/icons/quicklist-180.png",
      },
    },
  },
} as const satisfies TAppConfigItem;
