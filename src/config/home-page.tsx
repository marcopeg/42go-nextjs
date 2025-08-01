import type { Page } from "@/42go/components/pages";

const Foo = ({ name }: { name: string }) => <div>Hello, {name}!</div>;

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
      type: "component",
      component: Foo,
      props: {
        name: "42go",
      },
    },
    {
      type: "component",
      component: () => "faa",
      // props: {},
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
