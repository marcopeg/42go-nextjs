# Marketing and Demo Blocks

Use this for pricing, waitlist, feedback, and internal demo blocks.

Evidence:

- `src/42go/components/ContentBlock/blocks/PricingBlock.tsx`
- `src/42go/components/ContentBlock/blocks/WaitlistBlock.tsx`
- `src/42go/components/ContentBlock/blocks/FeedbackBlock.tsx`
- `src/42go/components/ContentBlock/blocks/DemoBlock.tsx`
- `src/config/home-page.tsx`
- `src/config/quicklist/config.ts`

## Pricing

```ts
{
  type: "pricing",
  title: "Simple Pricing for **Real** SaaS",
  subtitle: "No hidden fees.",
  tiers: [
    {
      name: "Starter",
      price: "$19",
      period: "/mo",
      description: "For solo devs.",
      features: [
        { text: "1 Project", status: "included" },
        { text: "Team Access", status: "excluded" },
        { text: "VIP Support", status: "coming-soon" },
      ],
      cta: { label: "Start", href: "/buy?plan=starter" },
      highlighted: true,
      badge: "Most Popular",
    },
  ],
}
```

`title`, `subtitle`, tier name, and tier description render Markdown.

## Waitlist

```ts
{
  type: "waitlist",
  title: "Join the **Waitlist**",
  subtitle: "No spam.",
  placeholder: "Your email address",
  buttonLabel: "Join Now",
  feedback: { type: "message", content: "You're on the list." },
}
```

Behavior:

- Client block.
- Posts `{ email }` to `/api/waitlist`.
- Feedback can be `{ type: "message", content }` or `{ type: "redirect", url }`.

Make sure the app enables the `api:waitlist` feature when using this block.

## Feedback

```ts
{
  type: "feedback",
  title: "Give Us Your **Feedback**",
  subtitle: "Be brave.",
  emailPlaceholder: "Your email address",
  messagePlaceholder: "Your feedback message",
  buttonLabel: "Send Feedback",
  showNewsletter: true,
  newsletterLabel: "Subscribe to updates",
  feedback: { type: "message", content: "Thanks." },
}
```

Behavior:

- Client block.
- Posts `{ email, message, newsletter }` to `/api/feedback`.
- Performs client-side email and message validation.

Make sure the app enables the `api:feedback` feature when using this block.

## Demo

```ts
{ type: "demo", title: "Button Demo", description: "UI state samples" }
```

Use `demo` for internal testing or documentation pages. Do not use it as product UI.
