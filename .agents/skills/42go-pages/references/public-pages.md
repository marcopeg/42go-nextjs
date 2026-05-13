# Public Pages Reference

Use this when changing `public.pages`, public page routes, or metadata.

## Evidence

- `src/42go/components/DynamicPage/types.ts`
- `src/42go/components/DynamicPage/DynamicPage.tsx`
- `src/42go/components/DynamicPage/utils.ts`
- `src/app/(public)/page.tsx`
- `src/app/(public)/[...slug]/page.tsx`
- `src/app/(public)/layout.tsx`
- `contents/default/docs/composable-pages/README.md`

## Runtime Shape

`Page` is:

```ts
export interface Page {
  items: ContentBlockItem[];
  meta?: {
    title?: string;
    description?: string;
  };
}
```

`DynamicPage` renders optional `meta.title` / `meta.description`, then passes `items` to the server `ContentBlock`.

## Routing

- `/` reads `public.pages.HomePage`.
- `/foo/bar` reads `public.pages["foo/bar"]`.
- Catch-all route IDs are produced by `params.slug.join("/").toLowerCase()`.
- Missing page data returns `notFound()` for catch-all routes.
- Root `/` is wrapped with `protectPage(HomePage)` but does not enforce an inferred feature for `/`.

## Metadata

`getPageMeta(pageId)` reads:

1. `config.public.pages[pageId].meta`
2. fallback `config.public.meta`
3. empty object

`themeColor` is removed from metadata because it belongs in viewport handling.

## Layout

All routes under `src/app/(public)` use:

```ts
const LayoutComponent = config?.theme?.PublicLayout || PublicLayout;
```

So page content should not recreate the public toolbar/footer shell. Use `theme.PublicLayout` when the whole public shell must change.

## Config Pattern

Prefer separate page modules for non-trivial pages:

```ts
// src/config/myapp/home-page.tsx
import type { Page } from "@/42go/components/DynamicPage";

export const HomePage: Page = {
  items: [
    { type: "hero", title: "My **App**" },
    { type: "markdown", source: "Public copy." },
  ],
};
```

Then import into `src/config/myapp/config.ts`:

```ts
public: {
  pages: {
    HomePage,
    about: AboutPage,
    "legal/privacy": PrivacyPage,
  },
}
```

Use lowercase route keys for catch-all pages. `HomePage` is the reserved root key.
