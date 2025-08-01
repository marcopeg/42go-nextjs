---
title: Markdown Block
---

With a _Markdown_ block you can render any kind of content by passing a source text or the path to a local `.md` file.

## Example

```ts
const config = {
  public: {
    pages: {
      HomePage: {
        items: [
          { type: "markdown", source: "Hello **World**" },
          { type: "markdown", path: "/path/to/source.md" },
        ],
      },
    },
  },
};
```

## Params

### source

Just write any valid [Markdown syntax](https://www.markdownguide.org/) and it will be rendered.

### path

Pass the path to a Markdown source file.

It can be an absolute path to your host's machine or container, or a relative path from your process' _CWD_.
