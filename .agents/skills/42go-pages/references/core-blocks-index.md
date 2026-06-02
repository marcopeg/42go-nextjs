# Core Blocks Index

Use this index to choose the right reference. Do not read every block reference by default.

## Registered Server Blocks

Evidence: `src/42go/components/ContentBlock/server.tsx`.

| Type | Purpose | Read |
| --- | --- | --- |
| `hero` | Landing-page hero title, subtitle, actions, optional background image and alignment. | [core-hero.md](core-hero.md) |
| `markdown` | Inline Markdown or Markdown file content. | [core-markdown.md](core-markdown.md) |
| `image` | Responsive `next/image` section with optional Markdown side content. | [core-image.md](core-image.md) |
| `component` | Direct React component reference with optional props. | [core-component-link.md](core-component-link.md) |
| `link` | Button-styled link. Also available in client ContentBlock. | [core-component-link.md](core-component-link.md) |
| `cta` | Primary and optional secondary call-to-action buttons with icon support. | [core-cta-stack.md](core-cta-stack.md) |
| `stack` | Recursive flex layout for grouping blocks and cells. | [core-cta-stack.md](core-cta-stack.md) |
| `pricing` | Pricing tiers with features and CTAs. | [core-marketing.md](core-marketing.md) |
| `waitlist` | Email capture form posting to `/api/waitlist`. | [core-marketing.md](core-marketing.md) |
| `feedback` | Feedback form posting to `/api/feedback`. | [core-marketing.md](core-marketing.md) |
| `demo` | Internal visual demo of UI primitives. Use sparingly. | [core-marketing.md](core-marketing.md) |

## Renderer Behavior

Evidence: `src/42go/components/ContentBlock/render-component.ts`.

- The renderer looks up `blocks[component.type]`.
- Known blocks receive `{ data: component }`.
- Known blocks can be wrapped with shared `margin.top` / `margin.bottom` spacing before rendering.
- Native blocks can implement internal `padding.top` / `padding.bottom` spacing.
- Server page blocks default to `margin.top: "[8rem]"`, `margin.bottom: "0"`, and zero internal padding.
- Unknown types render `UnknownBlock` with config details in development-style UI.
- Public pages use the server `ContentBlock`, not `ContentBlock/client.tsx`.

## Client ContentBlock

Evidence: `src/42go/components/ContentBlock/client.tsx`.

The client renderer only supports:

- `component`
- `link`

Use it for client-only locations such as toolbar action subsets, not normal `public.pages`.
