# Components

## Contents

- Primitive stack
- Buttons and actions
- Inputs and selection
- Panels and cards
- Book components
- Navigation
- Modal and panel overlays
- Feedback and loading
- Component creation rules

## Primitive stack

Build on shadcn/ui New York style, Radix primitives, Tailwind CSS, class-variance-authority, `clsx`, and `tailwind-merge`. Use Lucide icons. Keep component APIs semantic and variant-driven.

## Buttons and actions

Base button:

- inline flex, centered, 8 px gap;
- 8 px radius, 14 px medium label;
- 150–200 ms transition;
- disabled blocks pointer events and uses 50% opacity;
- 3 px focus ring at 50% ring color;
- default 36 px, small 32 px, large 40 px, hero 56 px, icon 36 px, FAB 56 px circle.

Variants:

| Variant | Use | Visual contract |
|---|---|---|
| `default` | Primary action | Primary fill, primary foreground, subtle shadow |
| `secondary` | Quiet filled action | Secondary fill, foreground |
| `outline` | Brand-related secondary action | Primary border/text, background fill, soft primary hover |
| `ghost` | Brand-related low emphasis | Transparent, soft primary hover |
| `link` | Brand navigation/action | Primary text, underline on hover |
| `neutralGhost` | Close, dismiss, toolbar utility | Neutral text, muted hover; never turns green |
| `neutralLink` | Cancel/dismiss text | Neutral text and underline; never turns green |
| `destructive` | Confirm delete | Red fill |
| `destructiveOutline` | Secondary destructive | Red border/text and red-tint hover |
| `destructiveGhost` | Tertiary destructive | Red text and red-tint hover |

Semantic rules:

- Cancel and dismiss: `neutralLink` or `neutralGhost`.
- Close icon: `neutralGhost`.
- Back may use `ghost` because it is navigational; avoid a loud fill.
- Destructive actions must remain red on hover and focus.
- Avoid multiple filled primary buttons in one action group.

## Inputs and selection

Text input:

- 36 px height, 8 px radius, 1 px input border, transparent surface, 12 px horizontal padding;
- 16 px text on mobile to avoid zoom; 14 px from `md` upward;
- subtle shadow; 3 px focus ring; destructive invalid state.

Textarea: minimum 80 px, same border/radius/focus contract.

Select: 40 px high, semantic background, 14 px text.

Segmented control:

- one rounded 8 px border container, muted surface at 20%, 4 px padding, 4 px gap;
- each tab is 40 px mobile and 48 px larger;
- selected: primary border, primary at 5–10% background, foreground text;
- unselected: transparent border, muted text, muted hover;
- use `role=tablist`, `role=tab`, and `aria-selected`.

Switch:

- 44 × 24 px track, full pill, 20 px thumb;
- primary on-state, muted/input off-state;
- expose `role=switch` and `aria-checked`.

Preference swatch:

- 48 px circle with 2 px border; selected gains primary border, 5% scale, and 12 px inner dot;
- 64 px total item width; 12 px label.

## Panels and cards

General `Panel`:

- semantic card background, 1 px border, 8 px radius;
- padding: none, 16 px, or default 24 px;
- header uses top alignment, 16 px bottom margin, 16 px gap;
- title 18 px/600; description 14 px muted;
- body gap: 8, 16, or 24 px;
- footer starts 16 px below the body.

Prefer panel composition (`Panel`, `PanelHeader`, `PanelBody`, `PanelFooter`) over a new one-off card. Do not hard-code white/gray surfaces; use semantic card tokens.

## Book components

Book cover:

- 2:3 aspect ratio, muted fallback surface, overflow hidden;
- 8–10 px outer radius in grid/detail; smaller radius when used as an 80 px thumbnail;
- object-cover for LingoCafe cover art.

Book grid card:

- cover is the card; no separate white text panel;
- subtle shadow, 8 px radius, 2 px hover lift, focus ring;
- black top and bottom gradients occupy roughly 40% each;
- title overlays top in warm white serif bold with strong drop shadow;
- author is smaller warm white at 85% opacity;
- tags overlay bottom as black 45% translucent chips with blur;
- level occupies a white square at bottom-right;
- “Reading” badge sits top-right in green, compact uppercase.

Book detail cover repeats the overlay title treatment at larger scale. Metadata stays outside the cover.

## Navigation

- Sidebar rows: 14 px, 20 px icon, 12 × 8 px padding, 6–8 px radius.
- Active nav uses typography and a quiet surface; hover adds primary affordance.
- Mobile nav stacks icon and label. Do not place more than four items plus optional More.
- Toolbar action groups use 16 px gap in app chrome and 8 px in public chrome.
- Back controls use a 20 px chevron in a 36 px icon button.

## Modal and panel overlays

Use the shared `Modal` abstraction backed by Radix Dialog. Do not build bespoke fixed overlays.

Presentation modes:

- `modal`: centered on desktop, full-screen on mobile;
- `panel`: anchored right/left/top/bottom on desktop, full-screen on mobile.

Desktop modal widths: 384, 448, 672, 896 px; full leaves 32 px viewport margin. Side-panel widths: 320, 420, 560, 720 px.

Overlay:

- black 45% scrim;
- stack from `z-700`, increment 20 for nested overlays;
- content shadow `2xl` and semantic background.

Header/footer:

- panel header 64 px with 24 px horizontal padding;
- modal header uses 20 px horizontal and 16 px vertical padding;
- 1 px separators;
- close uses a neutral 36 px icon button;
- body scrolls independently;
- footer stacks on narrow widths and aligns actions right on larger widths.

## Feedback and loading

- Error: 8 px radius, destructive border at 40%, destructive fill at 10%, 16 × 12 px padding, 14 px destructive text.
- Empty/loading card: 8 px radius, border, card background, 20 px padding, 14 px muted text, subtle shadow.
- Skeleton: muted fill, 8 px radius, pulse.
- Toasts inherit popover background/foreground/border and current theme.
- Loading spinners are 32 px for page loading and 16 px inside buttons. Use semantic primary/ring color instead of arbitrary accents.

## Component creation rules

Create a shared component when a pattern repeats across two surfaces, has meaningful states/variants, or defines an accessibility contract.

For complex components, separate container, presentation, and logic. Use explicit named exports, arrow functions, absolute imports, and typed variants. Keep responsive and state behavior in the component contract rather than copied call-site classes.

Before adding a new primitive:

1. Check whether shadcn/Radix already provides the behavior.
2. Check existing buttons, panels, Modal, inputs, dropdowns, and content blocks.
3. Extend the nearest semantic primitive.
4. Add accessible states and dark mode.
5. Decide whether the pattern belongs in this skill.
