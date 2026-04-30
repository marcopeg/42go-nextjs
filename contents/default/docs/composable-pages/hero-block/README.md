---
title: Hero Block
---

The _Hero Block_ renders as catchy page header and is usually placed at the top of a landing page.

## Example

```ts
const config = {
  public: {
    pages: {
      HomePage: {
        items: [
          {
            type: "hero",
            title: "Next **Multi**",
            subtitle: "Yet **Another** NextJS **Wrapper**",
            actions: [
              {
                label: "Join",
                href: "/join",
                style: "primary",
              },
              {
                label: "Read the Docs",
                href: "/docs",
                style: "secondary",
              },
            ],
          },
        ],
      },
    },
  },
};
```

## Params

### title

Renders as Markdown.

### subtitle

Renders as Markdown.

### actions[]

It's an array of configurable buttons.
