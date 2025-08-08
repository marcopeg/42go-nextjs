import type { Page } from "@/42go/components/DynamicPage";

const Foo = ({ name }: { name: string }) => <div>Hello, {name}!</div>;

export const HomePage: Page = {
  items: [
    {
      type: "hero",
      title: "Build Your SaaS **Faster**\nWith Our **AI-Friendly** Starter Kit",
      subtitle: "NextJS, Tailwind CSS, and 🤖",
      actions: [
        {
          label: "Buy",
          href: "/buy",
          style: "primary",
        },
        {
          label: "Quick Start",
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
    {
      type: "pricing",
      title: "Simple Pricing for **Real** SaaS",
      subtitle: "No hidden fees. No mercy for complexity.",
      tiers: [
        {
          name: "Starter",
          price: "$19",
          period: "/mo",
          description: "For solo devs and side projects.",
          features: [
            { text: "1 Project", status: "included" },
            { text: "Basic Support", status: "included" },
            { text: "Team Access", status: "excluded" },
          ],
          cta: { label: "Start", href: "/buy?plan=starter" },
        },
        {
          name: "Pro",
          price: "$49",
          period: "/mo",
          description: "For teams who fear nothing.",
          features: [
            { text: "10 Projects", status: "included" },
            { text: "Priority Support", status: "included" },
            { text: "Unlimited Chuck Norris jokes", status: "included" },
            { text: "Team Access", status: "included" },
            { text: "VIP Support", status: "coming-soon" },
          ],
          cta: { label: "Go Pro", href: "/buy?plan=pro" },
          highlighted: true,
          badge: "Most Popular",
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "",
          description: "For those who want to break the internet.",
          features: [
            { text: "Unlimited Projects", status: "included" },
            { text: "Dedicated Support", status: "included" },
            { text: "Custom Integrations", status: "included" },
          ],
          cta: { label: "Contact Us", href: "/contact" },
          badge: "Contact Sales",
        },
      ],
    },
  ],
};
