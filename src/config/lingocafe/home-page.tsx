import type { Page } from "@/42go/components/DynamicPage";

export const HomePage: Page = {
  items: [
    {
      type: "hero",
      title: "**LingoCafe**",
      subtitle: "Log in to keep learning together.",
      actions: [
        {
          label: "Log In",
          href: "/login",
          style: "primary",
        },
      ],
    },
  ],
};
