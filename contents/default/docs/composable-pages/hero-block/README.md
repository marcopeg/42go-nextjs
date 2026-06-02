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
            margin: { top: "0", bottom: "0" },
            padding: { top: "0", bottom: "0" },
            alignment: "center",
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

## Left-aligned Example

```ts
const config = {
  public: {
    pages: {
      AboutPage: {
        items: [
          {
            type: "hero",
            alignment: "left",
            title: "Build **faster**",
            subtitle: "A focused introduction with left-aligned copy and actions.",
            actions: [
              {
                label: "Get Started",
                href: "/docs",
                style: "primary",
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

### alignment

Optional. Controls the alignment of the hero title, subtitle, action buttons, content origin, and background image origin.

Accepted values:

- `"left"`
- `"center"`
- `"right"`

Defaults to `"center"`, which matches the original Hero Block layout.

### padding

Optional. Controls the Hero Block's internal top and bottom padding.

Defaults to zero. The old built-in outer and inner vertical padding is only added when explicitly configured through `padding`.

```ts
padding: {
  top: "0",
  bottom: { base: "8", md: "16" },
}
```
