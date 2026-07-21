# Reader and Editorial Surfaces

## Contents

- Reader principles
- Theme model
- Typography model
- Page anatomy
- Translation interaction
- Table of contents
- Preferences
- Playback
- Book discovery continuity

## Reader principles

The reader is a mode, not a normal page. Remove the application sidebar, bottom navigation, and normal content padding. Keep only navigation, progress, reading controls, and the text.

Protect these invariants:

- 680 px maximum text width;
- long, calm line height;
- user-selectable font, size, background, and foreground;
- independent scroll container;
- persistent but quiet progress;
- mobile-first translation and page navigation;
- foreground/background combinations filtered to WCAG AA.

## Theme model

Reader settings may override the app theme without changing the rest of the shell.

### Background choices

| Key | Label | Value |
|---|---|---|
| `app-background` | Auto | `var(--background)` |
| `paper` | Paper | `#f7f1e3` |
| `linen` | Linen | `#efe2c6` |
| `mist` | Mist | `#e8eef4` |
| `stone` | Stone | `#dde3ea` |
| `charcoal` | Charcoal | `#1f2937` |
| `midnight` | Midnight | `#0f172a` |

### Foreground choices

| Key | Label | Value |
|---|---|---|
| `app-foreground` | App | `var(--foreground)` |
| `ink` | Ink | `#1f2937` |
| `cocoa` | Cocoa | `#4b3527` |
| `deep-sea` | Deep Sea | `#16324a` |
| `chalk` | Chalk | `#f8fafc` |
| `cream` | Cream | `#fef3c7` |

Only offer foregrounds whose contrast ratio against the chosen background is at least 4.5:1.

Derive contextual variables from the selected pair:

```text
--reader-bg: background
--reader-fg: foreground
--reader-fg-muted: foreground at 70%
--reader-fg-soft: foreground at 8%
--reader-hover-bg: 88% background + 12% foreground
--reader-highlight-bg: 76% background + 24% foreground
--reader-highlight-fg: foreground
--reader-popover-bg: 94% background + 6% foreground
--reader-popover-border: foreground at 32%
--reader-border: foreground at 18%
```

Use `color-mix(in oklab, …)` when a source is a CSS variable. Use rgba when the source is a hex color.

## Typography model

Font size choices: 16, 17, 18, 19, 20, 21, 22, 24, 26, 28 px. Default to 21 px.

Font choices:

- Georgia — default classic serif;
- Palatino — open, light serif;
- Arial — neutral sans;
- Verdana — wide screen-optimized sans;
- Trebuchet MS — humanist sans;
- Tahoma — compact sturdy sans.

Default paragraph:

- selected font and size;
- line-height `1.85`;
- 28 px vertical margin;
- break long words safely.

Relative heading scale:

| Heading | Size | Line height | Top / bottom |
|---|---:|---:|---:|
| H1 | 2em | 1.15 | 32 / 20 px |
| H2 | 1.75em | 1.2 | 28 / 16 px |
| H3 | 1.35em | 1.28 | 24 / 12 px |
| H4 | 1.15em | 1.32 | 20 / 12 px |
| H5 | 1em | 1.35 | 16 / 8 px |
| H6 | .92em | 1.35 | 16 / 8 px |

## Page anatomy

1. Optional small muted prefix.
2. Large centered page title.
3. 208 px ornamental divider: hairline, asterisk, hairline.
4. Optional centered italic muted summary.
5. Markdown body.
6. Previous/progress/next navigator.

Use 48 px between page header and body. Keep the title maximum at the reader width and the summary at 576 px.

The page navigator uses 44 px circular outlined arrows and a central progress bar. It labels the current page and total. Disabled arrows remain visible at 40–60% opacity to preserve spatial stability.

## Translation interaction

Make sentence or word targets visually quiet until hover/focus. Use a 3 px radius, soft reader hover background, and standard focus ring.

- Do not trigger translation while the user is selecting text or dragging.
- A repeated tap on the active target closes it.
- Escape and a genuine outside tap close the popover.
- Desktop popover: 240–360 px wide, centered on the target, 8 px offset.
- Mobile popover: viewport-wide, square side edges, 20 px side padding.
- Popover: reader-derived background/border, 8 px radius desktop, 16 × 12 px padding, subtle blur.
- Playback sentence/word highlight uses a reader-derived highlight. Word highlight may mix primary at 34% with transparent.

Keep the tiny translation-source label unobtrusive. It is diagnostic metadata, not body content.

## Table of contents

Open as a right side panel on desktop and full-screen on mobile.

- Panel title: “Contents”; subtitle shows page count.
- Book summary block: 28 px radius, border, muted 20% surface, 16 px padding.
- Book thumbnail: 80 px wide; title 16 px semibold; author 14 px muted.
- Progress: 4 px track plus percentage.
- Page row: 16 px radius, 1 px border, 16 × 12 px padding, 14 px text.
- Current page uses muted fill and a small equalizer-like indicator.
- Footer contains a full-width outlined “Book info” action.

## Preferences

Open as a 420 px right panel on desktop and full-screen on mobile. Put a sticky preview card under the panel header.

Order:

1. app theme: Auto, Light, Dark segmented control;
2. font size slider with decrease/increase controls and value pill;
3. font family stacked 16 px-radius sample cards;
4. background swatches;
5. foreground swatches, revealed only for custom backgrounds;
6. translation scope segmented control;
7. full-width Done, optional reset link, local-storage note.

Store appearance settings per light/dark/system theme profile, share font size across profiles when appropriate, and preserve a stable storage version key.

## Playback

When closed, show a 56 px circular primary FAB at the bottom-right using safe-area offsets.

When open:

- fixed bottom player, 12 px viewport margins, max 672 px;
- 16 px radius, border, semantic background, `shadow-lg`;
- pause/resume neutral icon button;
- speed/settings compact control;
- progress slider and tabular percentage;
- neutral close button.

Settings opens immediately above the player and repeats the same surface. Use five equal speed columns. Toggles are full-row, 44 px minimum height.

## Book discovery continuity

The bookshelf, detail, and reader must feel connected:

- cover imagery and editorial serif title establish the book;
- detail exposes metadata and structure without changing the visual identity;
- reader removes cover art and transfers identity to typography, book/page titles, and progress;
- the green reading action is the transition point from discovery into focus mode.
