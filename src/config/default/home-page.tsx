import type { Page } from "@/42go/components/DynamicPage";

const Foo = ({ name }: { name: string }) => <div>Hello, {name}!</div>;

const contentImageRemotePatterns = process.env.CONTENT_IMAGE_REMOTE_PATTERNS ?? "";

const imageBlockExamples: Page["items"] = [
  {
    type: "image",
    image: {
      src: "/images/content-blocks/demo-image.svg",
      alt: "Abstract 42go composable content interface",
      width: 1200,
      height: 800,
      sizes: "(max-width: 768px) 100vw, 50vw",
      align: "left",
    },
    content: {
      source:
        "## Image ContentBlock\n\nPair a stable `next/image` asset with optional **Markdown** side content. The `sizes` hint keeps responsive loading honest.",
    },
  },
  {
    type: "image",
    image: {
      src: "/images/content-blocks/demo-image.svg",
      alt: "Image ContentBlock stacked layout example",
      width: 1200,
      height: 800,
      sizes: "(max-width: 768px) 100vw, 900px",
      align: "top",
      animation: "slideUp",
    },
    content: {
      animation: "fade",
      source:
        "### Stacked Layout\n\nUse `align: \"top\"` or `align: \"bottom\"` when the image should lead the section instead of sitting beside the copy.",
    },
  },
  {
    type: "image",
    image: {
      src: "/images/content-blocks/demo-image.svg",
      alt: "Image ContentBlock left layout with fade effect",
      width: 1200,
      height: 800,
      sizes: "(max-width: 768px) 100vw, 50vw",
      align: "left",
      valign: "center",
      animation: "fade",
    },
    content: {
      valign: "top",
      animation: "none",
      source:
        "### Left: Fade Image\n\nThe image fades in while the copy stays aligned to the top of the taller image. Use this when the layout should feel calm and direct.",
    },
  },
  {
    type: "image",
    image: {
      src: "/images/content-blocks/demo-image.svg",
      alt: "Image ContentBlock right layout with scale effect",
      width: 1200,
      height: 800,
      sizes: "(max-width: 768px) 100vw, 50vw",
      align: "right",
      valign: "bottom",
      animation: "scale",
    },
    content: {
      valign: "center",
      animation: "fade",
      source:
        "### Right: Scale Image\n\nThe copy leads on desktop and stays centered while the image sits at the bottom edge of the shared row. Mobile still stacks the image above content.",
    },
  },
  {
    type: "image",
    image: {
      src: "/images/content-blocks/demo-image.svg",
      alt: "Image ContentBlock left layout with slide and scale effects",
      width: 1200,
      height: 800,
      sizes: "(max-width: 768px) 100vw, 50vw",
      align: "left",
      valign: "top",
      animation: "slideUp",
    },
    content: {
      valign: "bottom",
      animation: "scale",
      source:
        "### Left: Slide Image, Bottom Copy\n\nThis example uses `slideUp` on the image and `scale` on Markdown content aligned to the bottom of the image row.",
    },
  },
  {
    type: "image",
    image: {
      src: "/images/content-blocks/demo-image.svg",
      alt: "Image ContentBlock right layout with static image and slide content",
      width: 1200,
      height: 800,
      sizes: "(max-width: 768px) 100vw, 50vw",
      align: "right",
      valign: "center",
      animation: "none",
    },
    content: {
      valign: "top",
      animation: "slideUp",
      source:
        "### Right: Centered Image, Long Copy\n\nThe image renders immediately and stays vertically centered when the text grows taller.\n\nAdd another paragraph and the image still holds the middle of the shared outbox. The content uses the existing `slideUp` reveal.",
    },
  },
];

const remoteImageBlockExamples: Page["items"] =
  contentImageRemotePatterns.includes("images.unsplash.com") ||
  contentImageRemotePatterns.includes("images.unsplash.com/**")
    ? [
        {
          type: "image",
          image: {
            src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80",
            alt: "Architectural geometric building facade",
            width: 1200,
            height: 800,
            sizes: "(max-width: 768px) 100vw, 50vw",
            unoptimized: true,
            align: "right",
            valign: "center",
          },
          content: {
            valign: "center",
            source:
              "### Remote Images\n\nExternal images render only when their host is explicitly listed in `CONTENT_IMAGE_REMOTE_PATTERNS`.",
          },
        },
      ]
    : [];

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

    ...imageBlockExamples,
    ...remoteImageBlockExamples,

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
