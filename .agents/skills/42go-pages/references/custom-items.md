# Custom Page Items

Use this before adding app-specific page content or new shared ContentBlock types.

## Preferred Path: Component Block

For app-specific content, use `type: "component"`.

```tsx
// src/config/myapp/MyLandingFeature.tsx
export const MyLandingFeature = ({ label }: { label: string }) => {
  return <section>{label}</section>;
};
```

```tsx
// src/config/myapp/home-page.tsx
import type { Page } from "@/42go/components/DynamicPage";
import { MyLandingFeature } from "@/config/myapp/MyLandingFeature";

export const HomePage: Page = {
  items: [
    {
      type: "component",
      component: MyLandingFeature,
      props: { label: "App-owned section" },
    },
  ],
};
```

If the custom component uses React hooks, browser APIs, or event handlers, put `"use client"` at the top of the component file.

## When to Add a New Core Block

Add a shared block only when:

- multiple apps can use it,
- the configuration shape should be type-safe and reusable,
- it belongs in the platform ContentBlock system,
- `type: "component"` would cause repeated boilerplate or inconsistent behavior.

## New Core Block Checklist

1. Create `src/42go/components/ContentBlock/blocks/MyBlock.tsx`.
2. Export a typed config with a literal `type` discriminant.
3. Import the block and type in `src/42go/components/ContentBlock/server.tsx`.
4. Add the type to `ContentBlockItem`.
5. Add the renderer to `blocksMap`.
6. If the block must render in client-only ContentBlock contexts, also update `src/42go/components/ContentBlock/client.tsx`.
7. Add or update docs under `contents/default/docs/composable-pages/` when the block is public platform API.
8. Run `npm run qa`.

Skeleton:

```tsx
export interface TMyBlock {
  type: "my-block";
  title: string;
}

export const MyBlock = ({ data }: { data: TMyBlock }) => {
  return <section>{data.title}</section>;
};
```

Server registration:

```tsx
import { MyBlock, type TMyBlock } from "./blocks/MyBlock";

export type ContentBlockItem =
  | ExistingBlock
  | TMyBlock;

Object.assign(blocksMap, {
  "my-block": MyBlock as unknown,
} as BlocksMap);
```

## Placement Rules

- Shared, reusable platform blocks live under `src/42go/components/ContentBlock/blocks`.
- App-specific page components live under `src/config/<app>/` or the app feature area.
- Public page config can live in `.ts` files unless JSX or inline components are used; use `.tsx` when needed.
- Prefer absolute imports with `@/`.
- Prefer arrow-function exports for new components.

## Validation

- `npm run qa` after code changes.
- For visual public pages, verify the route in the browser. Use `make app.start`; never run `npm dev` directly.
- If AppConfig changes are not reflected, restart the dev server.
