# Component and Link Blocks

Use this when adding direct React components or simple links to public pages.

Evidence:

- `src/42go/components/ContentBlock/blocks/ComponentBlock.tsx`
- `src/42go/components/ContentBlock/blocks/LinkBlock.tsx`
- `src/42go/components/ContentBlock/client.tsx`

## Component Block

Shape:

```ts
{
  type: "component",
  component: MyComponent,
  props: { name: "Marco" },
}
```

Behavior:

- Renders `<Component {...props} />`.
- Use for app-owned or page-specific UI.
- The page config file must import the component directly.

Guidance:

- Put app-specific components near the app feature that owns them.
- Do not place app-specific UI under `src/42go`.
- If the component uses hooks or browser APIs, the component file needs `"use client"`.

## Link Block

Shape:

```ts
{
  type: "link",
  label: "Docs",
  href: "/docs",
  variant: "outline",
  size: "lg",
}
```

Behavior:

- Renders a shadcn `Button` as a Next `Link`.
- Accepts button props except `children` and native `type`.
- Available in both server and client ContentBlock maps.

Guidance:

- Use `link` for a single button.
- Use `cta` when you need primary and secondary actions, icon support, spacing, or alignment.
