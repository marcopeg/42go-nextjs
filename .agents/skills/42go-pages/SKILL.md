---
name: 42go-pages
description: Agentic documentation for configuring and extending 42go public composable pages through `public.pages`, DynamicPage, and ContentBlock. Use when Codex needs to add or change public pages, choose page content blocks, document available public page components, or create custom page items.
---

# 42go Pages

Use this skill when working with public composable pages configured under `public.pages`.

Core implementation:

- `src/42go/components/DynamicPage/`
- `src/42go/components/ContentBlock/`
- `src/app/(public)/page.tsx`
- `src/app/(public)/[...slug]/page.tsx`
- app configs under `src/config/**/config.ts`

## Quick Workflow

1. Read the target app config and page file:
   - `src/AppConfig.ts`
   - `src/config/<app>/config.ts`
   - any imported page module such as `src/config/home-page.tsx`
2. For routing, metadata, and `public.pages` shape, read [references/public-pages.md](references/public-pages.md).
3. To choose existing page blocks, read [references/core-blocks-index.md](references/core-blocks-index.md), then only the block reference you need.
4. To add app-specific UI, read [references/custom-items.md](references/custom-items.md).
5. Run `npm run qa` after code changes.

## Configuration Shape

Public pages live at `config.public.pages`.

```ts
public: {
  pages: {
    HomePage: {
      meta: { title: "Home Page" },
      items: [
        { type: "hero", title: "Hello **World**" },
        { type: "markdown", source: "Body copy" },
      ],
    },
    "foo/bar": {
      meta: { title: "Foo Bar" },
      items: [{ type: "markdown", source: "Nested route" }],
    },
  },
}
```

`HomePage` renders `/`. Other keys render public catch-all routes. Slug keys are lowercased by `getPageId()`, so keep keys lowercase except the reserved `HomePage`.

## Existing Blocks

Do not load every block implementation by default. Use the index, then read the focused reference:

- [Core blocks index](references/core-blocks-index.md)
- [Hero](references/core-hero.md)
- [Markdown](references/core-markdown.md)
- [Image](references/core-image.md)
- [Component and Link](references/core-component-link.md)
- [CTA and Stack](references/core-cta-stack.md)
- [Pricing, Waitlist, Feedback, Demo](references/core-marketing.md)

## Custom Items

Use `type: "component"` for app-owned page content before adding a new shared core block.

Add a new shared ContentBlock only when the item is generic enough for multiple apps or needs reusable platform behavior. Keep app-specific UI outside `src/42go`.

Read [references/custom-items.md](references/custom-items.md) before creating custom page items or new block types.
