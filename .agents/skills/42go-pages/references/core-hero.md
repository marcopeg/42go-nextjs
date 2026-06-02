# Hero Block

Use this when adding or changing `type: "hero"` blocks.

Evidence:

- `src/42go/components/ContentBlock/blocks/HeroBlock.tsx`
- `contents/default/docs/composable-pages/hero-block/README.md`

## Shape

```ts
{
  type: "hero";
  alignment?: "left" | "center" | "right";
  backgroundImage?: string;
  padding?: { top?: string | object; bottom?: string | object };
  title?: string;
  subtitle?: string;
  actions?: Array<{
    label: string;
    href: string;
    style: "primary" | "secondary";
  }>;
}
```

At least one of `title`, `subtitle`, or `actions` is required by the type.

## Behavior

- `title` and `subtitle` render Markdown.
- `alignment` defaults to `"center"`.
- `alignment` controls text alignment, content origin, action justification, and background image origin.
- `backgroundImage` uses `cover`, an overlay, and alignment-specific `backgroundPosition`.
- `padding.top` and `padding.bottom` control Hero Block internal vertical spacing; default is zero.
- If there is no title but there is subtitle, the subtitle is rendered as the page hero `<h1>`.

## Example

```ts
{
  type: "hero",
  alignment: "left",
  backgroundImage: "/images/docs/authorization.png",
  title: "Build **faster**",
  subtitle: "Configuration-driven public pages.",
  actions: [
    { label: "Read Docs", href: "/docs", style: "primary" },
  ],
}
```

## Gotchas

- Do not use `hero` for small section headings. Use `markdown`, `cta`, or a custom component.
- Keep existing pages backward compatible by omitting `alignment` unless a visual change is intended.
