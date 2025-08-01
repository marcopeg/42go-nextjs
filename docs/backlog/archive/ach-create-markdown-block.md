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

## Goals

- [x] Scaffold a reusable Markdown block component at `@/components/Page/content/MarkdownBlock`
- [x] Render Markdown from both inline source and file path
- [x] Document usage and update Memory Bank if needed

## Acceptance Criteria

- [x] Markdown block renders Markdown input from both `source` and `path`
- [x] Component is reusable and documented
- [x] No lint/build errors

## Development Plan

1. Read the Memory Bank for architectural and feature context.
2. Review this task file for requirements.
3. Scaffold the Markdown block component at `@/components/Page/content/MarkdownBlock`.
4. Use the existing `MarkdownRenderer` for rendering.
5. Implement logic to accept either `source` or `path` (one required).
6. For `path`, load the file server-side and pass content to renderer.
7. Add usage example in config and docs.
8. Update documentation and Memory Bank if new best practices or dependencies are introduced.
9. Prepare for execution: no errors, no mercy.

## Next Steps

- [x] Fix up the exported types
- [x] Make sure that fs reads are kept in memory for cache so to do not hit the disk at every page load
- [x] Separate the presentational logic from the MarkdownBlock, build a custom first level component for the pure rendering part
- [ ] In that component, try to import the rendering functionalities that we use from the docs for styling and links rendering so to cleanup the docs part
