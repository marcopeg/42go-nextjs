# Markdown Block

Use this when adding static copy, docs excerpts, or file-backed Markdown to public pages.

Evidence:

- `src/42go/components/ContentBlock/blocks/MarkdownBlock.tsx`
- `contents/default/docs/composable-pages/markdown-block/README.md`

## Shape

Inline source:

```ts
{ type: "markdown", source: "Hello **World**" }
```

File path:

```ts
{ type: "markdown", path: "contents/default/docs/intro.md" }
```

The type allows either `source` or `path`, not both.

## Behavior

- This is a server-only block.
- Relative paths resolve from `process.cwd()`.
- Missing files render a yellow warning block instead of throwing.
- Markdown is wrapped in `max-w-4xl mx-auto px-4` for readability.

## Guidance

- Use `source` for short page copy.
- Use `path` when the content already lives as Markdown or should be edited by non-code workflows.
- Prefer app-specific content folders for app-owned public copy.
