---
title: Composable Pages
---

_Composable Pages_ is a simple and quick way that you can use to build custom routes in your App traight from the config.

## Configuration Example

```ts
const config = {
  default: {
    public: {
      pages: {
        // The "HomePage" key is used by the root website page:
        HomePage: {
          meta: {
            title: "Home Page",
          },
          items: [
            { type: "markdown", source: "Hello **World**" },
            { type: "component", component: () => "Hello World" },
          ],
        },
        // Any other key will respond to a custom route:
        "foo/bar": {
          meta: { title: "Foobar", description: "A custom page" },
          items: [{ type: "markdown", source: "Hello **World**" }],
        },
      },
    },
  },
};
```

## Reserved page Keys

- HomePage: renders the website's home page

## Metadata

The key `meta` lets you declare SEO metadata for the page.

If you omit it, the `config.public.meta` is used as default.

## Content Blocks

Pass the _Content Blocks_ in the `items[]` property.

> It's an array and the order matters at rendering time.

> You can use the same block multiple times with different settings.

- [Hero Section](./hero-block.md): renders a big Hero Section with call to actions
- [Markdown](./markdown-block.md): renders Markdown from an inline source or a referenced file
- [Image](./image-block.md): renders a responsive image with optional Markdown side content
- [Custom Component](./component-block.md): renders a custom React component

### Shared Block Spacing

Every block supports optional `margin` and `padding` objects for vertical spacing.

```ts
{
  type: "image",
  margin: {
    top: { base: "8", md: "16" },
    bottom: "12",
  },
  padding: {
    top: "0",
    bottom: "8",
  },
  image: {
    src: "/images/content-blocks/demo-image.svg",
    alt: "Demo image",
    width: 1200,
    height: 800,
  },
}
```

`margin.top`, `margin.bottom`, `padding.top`, and `padding.bottom` accept either a single Tailwind spacing unit or a responsive dictionary with `base`, `sm`, `md`, `lg`, `xl`, and `2xl` keys.

`margin` is applied by the shared block renderer outside the block. `padding` is applied inside each block so it replaces that block's own vertical padding when present.

Defaults:

- `margin.top`: `"[8rem]"`
- `margin.bottom`: `"0"`
- `padding.top`: `"0"`
- `padding.bottom`: `"0"`

Supported unit forms:

- Tailwind numeric spacing units, such as `"0"`, `"4"`, `"8"`, `"16"`, or `"1.5"`.
- `"px"` and `"auto"`.
- Tailwind arbitrary values, such as `"[3.75rem]"`.
