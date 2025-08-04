import type { Page } from "@/42go/components/DynamicPage";

export const AboutPage: Page = {
  meta: {
    title: "About Us",
    description: "Learn more about our legendary app",
  },
  items: [
    {
      type: "hero",
      title: "About **Our Legendary** App",
      subtitle: "Powered by the **legendary force** of Chuck Norris",
      actions: [
        {
          label: "Contact Us",
          href: "/contact",
          style: "primary" as const,
        },
      ],
    },
    {
      type: "markdown",
      source:
        "This is a dynamically generated about page from the CMS configuration. Chuck Norris doesn't need an about page - his reputation speaks for itself.",
    },
  ],
};
