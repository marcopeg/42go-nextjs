# Components

## Contents

- Primitive stack
- Buttons and actions
- Inputs and selection
- Panels and cards
- Plain lists
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

### Expandable FAB

Use `ExpandableFab` when one persistent 56 px primary floating action needs to
perform a direct action or reveal a small set of closely related actions.

- Keep the main FAB circular, solid primary, icon-only, and explicitly labelled
  for assistive technology.
- In multi-action mode, activating the FAB only expands or collapses the actions;
  it must not also invoke a default action. Touch devices use tap. Desktop may
  opt into mouse-hover opening while retaining click and keyboard activation.
- Expose placement as side plus start/center/end alignment. Choose the placement
  that keeps every action inside safe viewport edges.
- Render expanded actions as separate minimum-44 px labelled buttons with no
  enclosing card. Use semantic neutral popover surfaces, borders, foregrounds,
  and restrained elevation so the primary FAB remains dominant.
- For mutually exclusive actions, show a check and expose the selected state
  semantically. Update that check optimistically on selection, then wait about
  300 ms before committing the action and closing so the state change is
  perceptible. Do not make users infer state from color or icons alone.
- Without `selectedActionId`, treat actions as ordinary menu commands: do not
  reserve selection feedback or delay their callbacks. This keeps the same FAB
  suitable for both switchable options and simple action submenus.
- Reveal and dismiss actions with a simple 150–200 ms fade. Avoid directional
  slide, scale, stagger, or spring effects. Disable animation under
  `prefers-reduced-motion`.
- When `openOnHover` is enabled, keep the menu open while the mouse is over the
  trigger or action cluster. Require about 300 ms of trigger hover before
  opening so incidental pointer travel does not flicker the menu, and allow a
  short close delay to bridge the trigger/action gap. Ignore touch and pen
  hover signals so mobile behavior stays tap-driven.
- Use a non-modal Radix menu for keyboard order, Escape, outside dismissal, and
  focus return. A speed dial is not a dialog and must not trap focus or add a
  scrim.
- Suppress focus rings on the transparent menu container. Keep the visible
  focus ring on the actual action item so first-open focus never outlines the
  entire action cluster. Reset the container border, outline, box shadow, and
  WebKit tap highlight directly on the portaled element because mobile Safari
  may paint first-focus chrome before utility focus styles settle.
- Close the action list after selection and whenever its owning surface goes
  away. Keep disabled actions visible only when that helps explain capability.

The portable starter is `assets/starter/expandable-fab.tsx`.

### Translation-scope FAB

Use `TranslationScopeFab` for a one-tap reader setting that alternates between
word and sentence translation without opening a menu.

- Keep it a solid-primary, 56 px circular FAB. Do not widen it into a pill on
  mobile reading surfaces where it can compete with page navigation.
- Use the Lucide `Languages` icon as the persistent control symbol. Add a small
  high-contrast circular badge at the bottom-right: `W` for word mode and `S`
  for sentence mode. The badge makes the active state visible without consuming
  reader width; it does not replace the accessible mode label.
- One click, tap, Enter, or Space toggles the canonical setting immediately.
  The accessible name must state both the current mode and the next mode.
- Roll the badge upward into its replacement over about 180 ms. Keep the FAB's
  outer geometry still, and disable the animation under reduced motion.
- On desktop hover and keyboard focus, show a short non-interactive tooltip:
  `Click here to switch translation mode to …`, naming the next mode. Do not
  show the tooltip on touch viewports.
- When the control is fixed over a reader, give the content below it sufficient
  bottom padding so page navigation and terminal content can scroll completely
  above the floating action area.

The portable starter is `assets/starter/translation-scope-fab.tsx`; it needs
the accompanying `translation-scope-badge-roll-up` keyframe from the starter
Tailwind stylesheet.

## Inputs and selection

Text input:

- 36 px height, 8 px radius, 1 px input border, transparent surface, 12 px horizontal padding;
- 16 px text on mobile to avoid zoom; 14 px from `md` upward;
- subtle shadow; 3 px focus ring; destructive invalid state.

Textarea: minimum 80 px, same border/radius/focus contract.

Select: 40 px high, semantic background, 14 px text.

Segmented data picker (setting tabs):

- one rounded 8 px border container, muted surface at 20%, 4 px padding, 4 px gap;
- each option is 40 px mobile and 48 px larger;
- selected: primary border, primary at 5–10% background, foreground text;
- unselected: transparent border, muted text, muted hover;
- use it to choose one value for information or a setting, such as theme, speed, level, or translation scope;
- do not use it to navigate between subviews;
- use a labelled `role=group` with button `aria-pressed` states for immediate settings, or a radio group when the value belongs to a form.

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

## Plain lists

Use `PlainList`, `PlainListItem`, and `PlainListButton` from
`@/42go/components/PlainList` for dense app rows that should read as one
continuous list instead of separate cards.

- On mobile, the list owns the standard `24px` negative horizontal margins so
  rows reach the viewport edges and use hairline dividers.
- Set `flushMobileTop` on both `AppLayout` and `PlainList` only when the list is
  the first rendered page content and should meet the app toolbar directly.
  `AppLayout` removes its mobile top padding while `PlainList` removes the
  redundant top border; normal desktop spacing and containment remain.
- At `md` and above, the list becomes one contained, rounded, bordered surface.
  Rows remain divided; do not turn each row back into a separate card.
- `PlainListButton` owns row padding, full-width hit area, hover feedback, and
  the visible focus ring. Keep its contents structured with a leading icon,
  `min-w-0` text, and optional trailing metadata or action.
- Callers may add semantic status backgrounds or tints, but must keep
  text/icons so state is never encoded by color alone.
- Do not recreate the `-mx-6`, divider, flush-top, or focus classes at call
  sites. Do not counteract app-shell padding with a negative vertical margin;
  that layout is unreliable in iOS WebKit.

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

Subview navigation tabs:

- use them to switch between peer views inside the same page, panel, or popover;
- make them a flat, full-width row rather than a rounded segmented picker;
- the standard component owns an explicit `1px solid var(--border)` leading border on every tab after the first;
- indicate the active view with restrained primary tint and a 2 px bottom indicator;
- use `role=tablist`, `role=tab`, `aria-selected`, roving focus, and linked tab panels;
- do not use navigation tabs to select a setting value.

In this repository, use `NavigationalTabs` from `@/components/ui/navigational-tabs`. Do not recreate its layout or separator at the call site.

## Modal and panel overlays

Use the shared `Modal` abstraction backed by Radix Dialog. Do not build bespoke fixed overlays.

### Lightweight mobile option sheets

Use `SwipeableBottomSheet` from `@/42go/components/SwipeableBottomSheet` for a
short mobile-only list of choices or closely related actions. Prefer it when
the same interaction is a contextual popover on desktop and a native-style
bottom sheet below `md`.

- Keep the visible content focused: one sentence-case title and a short option
  list with minimum 44 px rows. Do not put multi-step forms or long editors in
  this surface; use `Modal` for those.
- Let the shared component own the rounded sheet, safe area, scrim, focus,
  Escape, drag tracking, velocity/distance threshold, snap-back, and exit
  timing. Never reproduce those mechanics in domain code.
- Allow downward direct manipulation from both sheet and backdrop. Fade the
  scrim proportionally while dragging.
- Backdrop taps and committed drags must slide the sheet fully below the
  viewport and fade the scrim to zero before unmount. A short drag returns to
  rest.
- Use the component's `close()` handle when choosing an option triggers
  navigation or another visible state change. Defer that action until
  `onCloseComplete` so the exit remains perceptible.
- Adapt reduced motion with a shorter transition rather than an abrupt
  disappearance; direct-manipulation feedback must remain understandable on
  iOS Home Screen apps.

Use `Modal` instead for forms, confirmations, scroll-heavy content, drawers,
side panels, multi-step workflows, and full-screen overlays.

### Focused mobile editors

Use the QuickList add/edit surface as the canonical mobile pattern when a modal
edits one input, one textarea, or a short group of controls:

- Below `md`, cover the viewport with `fixed inset-0`, `100dvh`, and a
  translucent blurred semantic background.
- Use a three-part flex column: compact header, independently scrollable body,
  and fixed action footer.
- Give the header 16 px horizontal/top and 12 px bottom spacing, a 16 px
  semibold title, a bottom border, and an optional 36 px neutral close control.
- Give the body 16 px horizontal and 12 px vertical spacing. Autofocus the
  primary control and select existing text when replacement is the likely task.
- Keep mobile text inputs at 16 px to prevent browser zoom. Use 12 px control
  inset, an 8 px radius, semantic border/background, and the primary focus ring.
  A primary textarea starts at 140 px high. Space a small control group on the
  4 px grid without introducing cards inside the editor.
- Give the footer 16 px horizontal, 8 px top, and 16 px plus the device safe
  area at the bottom. Move it above the software keyboard using
  `visualViewport`. Use an 8 px action gap.
- Use equal-width Cancel and Save actions for simple forms. Cancel stays neutral;
  Save uses primary. Both use 16 px labels and 12 px vertical padding.
- Keep normal-state helper copy and counters out of the surface. Put concise
  validation next to the affected control only when action is required.
- At `md` and above, use the shared centered `Modal` or appropriate panel while
  preserving the same field order, labels, validation, and action hierarchy.

Use `TextareaModal` for the single-textarea version. For an input or a few
controls, reuse this shell and substitute only the body controls. The caller
owns domain validation and persistence; the pattern owns responsive chrome,
focus, keyboard avoidance, safe areas, and action hierarchy.

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
