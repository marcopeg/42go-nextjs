---
title: Image Block
---

The _Image Block_ renders a responsive `next/image` section with optional Markdown content beside or around it.

Use it for landing-page sections where an image and a short explanation should stay in AppConfig instead of becoming a custom React component.

## Example

```ts
const config = {
  public: {
    pages: {
      HomePage: {
        items: [
          {
            type: "image",
            margin: { top: "0", bottom: "0" },
            padding: { top: "0", bottom: "0" },
            image: {
              src: "/images/content-blocks/demo-image.svg",
              alt: "Abstract 42go composable content interface",
              width: 1200,
              height: 800,
              sizes: "(max-width: 768px) 100vw, 50vw",
              style: "default",
              maxWidth: "md",
              align: "left",
              valign: "center",
              animation: "fade",
            },
            content: {
              valign: "top",
              animation: "slideUp",
              source:
                "## Image ContentBlock\n\nPair a stable image with **Markdown** side content.",
            },
          },
        ],
      },
    },
  },
};
```

## Params

### padding

Optional. Controls the Image Block's internal top and bottom padding.

Defaults to zero.

```ts
padding: {
  top: "0",
  bottom: { base: "8", md: "16" },
}
```

### image.src

Required. Public path or remote URL for the image.

Local images should live under `public/` and be referenced by their browser path, such as `/images/content-blocks/demo-image.svg`.

Remote images must match `CONTENT_IMAGE_REMOTE_PATTERNS` in `next.config.ts`.

### image.alt

Required. Accessible text alternative for the image.

### image.width and image.height

Required. AppConfig uses string paths and URLs, so Next.js cannot infer image dimensions at build time.

Set the intrinsic pixel width and height of the image. Next.js uses these values to preserve aspect ratio and prevent layout shift.

### image.sizes

Optional but recommended.

`sizes` tells the browser how wide the rendered image will be at different viewport sizes. The browser uses it with Next.js generated `srcset` values to choose an efficient file.

Common examples:

```ts
// Full width on mobile, half page on desktop
sizes: "(max-width: 768px) 100vw, 50vw";

// Full width on mobile, capped large section on desktop
sizes: "(max-width: 768px) 100vw, 900px";
```

If `sizes` is missing, browsers may pick a larger image than needed.

### image.unoptimized

Optional. Disables Next.js image optimization for this image.

Defaults to `true` for loopback URLs such as `http://localhost:4000/...`, and `false` otherwise. Use it for development-only local asset servers or for trusted remote images that should be requested directly by the browser.

### image.style

Optional. Controls the image frame styling.

Accepted values:

- `"default"`: rounded frame with border and muted background.
- `"transparent"`: no border, no rounded clipping, and transparent background.

Defaults to `"default"`.

Use `"transparent"` for images with transparency or images that already include their own visual boundary.

### image.maxWidth

Optional. Controls the maximum rendered width of the image frame.

If omitted, image blocks keep their previous defaults:

- `"max-w-2xl"` for image-and-content layouts.
- `"max-w-4xl"` for image-only layouts.

Preset values map to Tailwind max-width classes:

```ts
maxWidth: "xs";  // max-w-xs
maxWidth: "sm";  // max-w-sm
maxWidth: "md";  // max-w-md
maxWidth: "lg";  // max-w-lg
maxWidth: "xl";  // max-w-xl
maxWidth: "2xl"; // max-w-2xl
maxWidth: "3xl"; // max-w-3xl
maxWidth: "4xl"; // max-w-4xl
```

Custom CSS values are also accepted and applied as an inline `max-width` style:

```ts
maxWidth: "320px";
maxWidth: "20vw";
maxWidth: "min(100%, 360px)";
```

Use presets for standard page composition. Use custom CSS values only when the layout needs a precise cap.

### image.align

Optional. Controls image placement relative to `content`.

Accepted values:

- `"left"`
- `"right"`
- `"top"`
- `"bottom"`

Defaults to `"left"`.

On mobile, `"left"` and `"right"` stack like `"top"` so the image appears above the content.

### image.valign

Optional. Controls vertical alignment of the image inside the shared image-and-content row.

Accepted values:

- `"top"`
- `"center"`
- `"bottom"`

Defaults to `"center"`.

This only applies to `"left"` and `"right"` layouts with content. It lets a smaller image sit at the top, middle, or bottom of a taller text column.

### image.animation

Optional reveal animation for the image.

Accepted values:

- `"none"`
- `"fade"`
- `"scale"`
- `"slideUp"`

Defaults to `"none"`.

### content.source

Inline Markdown content.

Use either `content.source` or `content.path`, never both.

### content.path

Path to a Markdown file.

Relative paths resolve from the process current working directory.

Use either `content.source` or `content.path`, never both.

### content.valign

Optional. Controls vertical alignment of the Markdown content inside the shared image-and-content row.

Accepted values:

- `"top"`
- `"center"`
- `"bottom"`

Defaults to `"center"`.

This only applies to `"left"` and `"right"` layouts. Use `"top"` when text should align to the top of a taller image, or `"center"` when a shorter image should sit centered beside longer text.

### content.animation

Optional reveal animation for the Markdown content.

Accepted values:

- `"none"`
- `"fade"`
- `"scale"`
- `"slideUp"`

Defaults to `"none"`.

These values reuse the existing `ScrollAnimation` component. The Image Block does not add new animation primitives.

## Remote Images

Configure remote image hosts with `CONTENT_IMAGE_REMOTE_PATTERNS`.

```env
CONTENT_IMAGE_REMOTE_PATTERNS="https://assets.lingocafe.app/**,https://images.unsplash.com/**"
```

This setting is an allowlist. External images are not loaded through `next/image` unless their URL matches one of the configured patterns.

Set `image.unoptimized: true` to bypass Next.js optimization for a trusted remote image. Loopback URLs such as `http://localhost:4000/...` do this automatically so local development asset servers do not hit Next.js private-IP protection.
