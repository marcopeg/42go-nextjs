# Image Block

Use this when a public composable page needs a responsive image plus optional Markdown side content.

Evidence:

- `src/42go/components/ContentBlock/blocks/ImageBlock.tsx`
- `contents/default/docs/composable-pages/image-block/README.md`

## Shape

```ts
{
  type: "image",
  padding: {
    top: "0",
    bottom: "0",
  },
  image: {
    src: "/images/content-blocks/demo-image.svg",
    alt: "Abstract interface illustration",
    width: 1200,
    height: 800,
    sizes: "(max-width: 768px) 100vw, 50vw",
    unoptimized: false,
    style: "default",
    maxWidth: "md",
    align: "left",
    valign: "center",
    animation: "none",
  },
  content: {
    valign: "top",
    animation: "none",
    source: "## Markdown side content",
  },
}
```

## Behavior

- This is a server-only block.
- It uses Next.js `Image`.
- `padding.top` and `padding.bottom` control Image Block internal vertical spacing; default is zero.
- `image.width` and `image.height` are required because AppConfig image sources are string paths or URLs.
- `image.sizes` is optional but should be set in real examples.
- `image.unoptimized` is optional; use it for trusted remote images that should bypass Next.js optimization. Loopback URLs such as `http://localhost:4000/...` default to unoptimized.
- `image.style` accepts `default` or `transparent`; `transparent` removes the frame border, clipping, and muted background.
- `image.maxWidth` is optional and controls the rendered image frame cap. Presets are `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, and `4xl`. Custom CSS values such as `320px`, `20vw`, or `min(100%, 360px)` are also accepted.
- `image.align` accepts `left`, `right`, `top`, or `bottom`; `left` and `right` stack like `top` on mobile.
- `image.valign` accepts `top`, `center`, or `bottom` for left/right layouts with content; default is `center`.
- `image.animation` accepts `none`, `fade`, `scale`, or `slideUp`; default is `none`.
- `content.source` is inline Markdown.
- `content.path` is file-backed Markdown.
- `content.valign` accepts `top`, `center`, or `bottom` for left/right layouts; default is `center`.
- `content.animation` accepts `none`, `fade`, `scale`, or `slideUp`; default is `none`.
- Use either `content.source` or `content.path`, not both.

## Remote Images

Remote image URLs must match `CONTENT_IMAGE_REMOTE_PATTERNS` in `next.config.ts`.

Example:

```env
CONTENT_IMAGE_REMOTE_PATTERNS="https://assets.lingocafe.app/**,https://images.unsplash.com/**"
```

Do not hardcode app-specific remote image hosts into `next.config.ts` for this block.
