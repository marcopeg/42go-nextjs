import type { Page } from "@/components/Page";

export const HomePage: Page = {
  items: [
    {
      type: "hero",
      title: "Build Your SaaS **Faster**\nWith Our **AI-Friendly** Starter Kit",
      subtitle: "Powered by **Chuck Norris** himself",
      actions: [
        {
          label: "Buy",
          href: "/login",
          style: "primary",
        },
        {
          label: "Read the Docs",
          href: "/docs",
          style: "secondary",
        },
      ],
    },
    {
      type: "markdown",
      source: "This is a **Markdown Block** rendered.",
    },
    {
      type: "markdown",
      path: "/Users/marcopeg/dv/marcopeg/42go-next/test/fixtures/markdown-block-01.md",
    },
    {
      type: "markdown",
      path: "test/fixtures/markdown-block-01.md",
    },
    // {
    //   type: "demo",
    //   title: "Button Playground by Chuck Norris 🥋",
    //   description:
    //     "Testing all button variants and combinations - Chuck Norris style!",
    // },
  ],
};
