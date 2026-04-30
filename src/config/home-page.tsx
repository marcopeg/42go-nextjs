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
          label: "Join",
          href: "/login",
          style: "primary",
        },
        {
          label: "Quick Start",
          href: "/docs",
          style: "secondary",
        },
      ],
    },

    // Feedback block before waitlist
    {
      type: "feedback",
      title: "Give Us Your **Feedback**",
      subtitle: "Chuck Norris reads every message. Be brave.",
      emailPlaceholder: "Your email address",
      messagePlaceholder: "Your feedback message",
      buttonLabel: "Send Feedback",
      showNewsletter: true,
      newsletterLabel: "Subscribe to roundhouse updates",
      feedback: {
        type: "message",
        content: "Thanks for your feedback! Chuck Norris approves.",
      },
    },

    {
      type: "waitlist",
      title: "Join the **Waitlist**",
      subtitle: "Get early access. **No spam.** Only roundhouse kicks.",
      placeholder: "Your email address",
      buttonLabel: "Join Now",
      feedback: {
        type: "message",
        content: "You're on the list. Chuck Norris approves.",
      },
    },
    {
      type: "waitlist",
      title: "With redirect",
      subtitle: "Get early access. **No spam.** Only roundhouse kicks.",
      placeholder: "Your email address",
      buttonLabel: "Join Now",
      feedback: {
        type: "redirect",
        url: "/thank-you",
      },
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

    // --- CTA Block Examples ---
    {
      type: "cta",
      action: {
        href: "/signup",
        label: "Start Free Trial",
        icon: "Rocket",
        size: "hero",
        variant: "default",
      },
      secondary: {
        href: "/docs",
        label: "Read Docs",
        icon: "BookOpen",
        variant: "ghost",
      },
      spacing: "lg",
      align: "center",
      direction: "column",
    },
    {
      type: "cta",
      action: {
        href: "/buy",
        label: "Buy Now",
        icon: "CreditCard",
        size: "hero",
        variant: "default",
      },
      secondary: {
        href: "/brochure.pdf",
        label: "Download Brochure",
        icon: "Download",
        variant: "outline",
        target: "_blank",
      },
      spacing: "xl",
      align: "center",
      direction: "row",
    },
    // --- End CTA Block Examples ---

    {
      type: "markdown",
      source: "This is a **Markdown Block** rendered.",
    },
    {
      type: "markdown",
      path: "./test/fixtures/markdown-block-01.md",
    },
    {
      type: "markdown",
      path: "./contents/default/docs/getting-started/README.md",
    },
  ],
};
