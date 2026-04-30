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
- [Custom Component](./component-block.md): renders a custom React component
