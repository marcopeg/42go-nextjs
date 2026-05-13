# CTA and Stack Blocks

Use this when composing buttons or arranging blocks.

Evidence:

- `src/42go/components/ContentBlock/blocks/CTABlock.tsx`
- `src/42go/components/ContentBlock/blocks/StackBlock.tsx`
- `src/config/default/config.ts`

## CTA Block

Shape:

```ts
{
  type: "cta",
  action: {
    href: "/signup",
    label: "Start Free Trial",
    icon: "Rocket",
    variant: "default",
    size: "hero",
  },
  secondary: {
    href: "/docs",
    label: "Read Docs",
    icon: "BookOpen",
    variant: "ghost",
  },
  align: "center",
  direction: "row",
  spacing: "md",
}
```

Options:

- `align`: `"center" | "left" | "right"`
- `direction`: `"row" | "column"`
- `spacing`: `"none" | "sm" | "md" | "lg" | "xl"`
- `action.variant`: `"default" | "secondary" | "outline" | "ghost"`
- `action.size`: `"sm" | "md" | "lg" | "xl" | "hero"`
- `icon`: PascalCase Lucide icon name, resolved from `lucide-react`.

Use `cta` for button groups. Use `link` for a single plain button link.

## Stack Block

Shape:

```ts
{
  type: "stack",
  direction: { base: "column", md: "row" },
  spacing: "md",
  wrap: true,
  align: "start",
  justify: "between",
  items: [
    { type: "markdown", source: "Left cell" },
    {
      items: [
        { type: "markdown", source: "Nested cell" },
        { type: "cta", action: { href: "/login", label: "Login" } },
      ],
      grow: true,
      basis: "1/3",
      className: "p-2 border rounded-md",
    },
  ],
}
```

Behavior:

- `stack` is recursive and can render nested `ContentBlockItem`s.
- `items` can be direct blocks or rich cells with `items`.
- `direction` and `spacing` support either plain strings or responsive objects with `base`, `sm`, `md`, `lg`, `xl`.

Guidance:

- Use `stack` for layout only. Keep semantic content in child blocks.
- Use `className` on cells as an escape hatch, not as the default design path.
