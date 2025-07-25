import type { Page } from "@/components/Page";

export const HomePage: Page = {
  items: [
    {
      type: "hero",
      title: "Build Your SaaS **Faster**\nWith Our **AI-Friendly** Starter Kit",
      subtitle: "Powered by **Chuck Norris** himself",
      actions: [
        {
          label: "Join Us!",
          href: "/login",
          style: "primary",
        },
        {
          label: "Learn More",
          href: "/about",
          style: "secondary",
        },
      ],
    },
    {
      type: "demo",
      title: "Button Playground by Chuck Norris 🥋",
      description:
        "Testing all button variants and combinations - Chuck Norris style!",
    },
    {
      type: "text",
      content: "First text here",
    },
    {
      type: "text",
      content: "Second text here",
    },
  ],
};
