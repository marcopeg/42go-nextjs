# Create Markdown Block [ach]

We need to create a new `@/components/Page/content/MarkdownBlock` component that can render Markdown in a page configuration.

The idea is to be able to take both plain markdown or a path to a markdown file to render:

```js
const config = {
  default: {
    public: {
      pages: {
        HomePage: {
          items: [
            {
              type: "markdown",
              source: "Hello **World**",
            },
            {
              type: "markdown",
              path: "/to/my/file.md",
            },
          ],
        },
      },
    },
  },
};
```

The type of this component should make either `source` or `path` mandatory.

For this first iteration the goal is simply to build the component and apply the basic markdown redering via the `import MarkdownRenderer from "@/components/docs/MarkdownRenderer";` component. Nothing fancy.

The main goal is to verify that both inline content and path to file works correctly.

This is expected to be a server side component.
