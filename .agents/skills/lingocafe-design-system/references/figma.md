# Figma Model and Handoff

## Contents

- File structure
- Variables and modes
- Styles
- Component library
- Responsive frames
- Prototyping
- Handoff and tools

## File structure

Use one library file or one clearly separated page group:

```text
00 Cover & status
01 Foundations
02 Components
03 Patterns
04 Public & marketing
05 App shell
06 Books
07 Reader
90 Playground
99 Deprecated
```

Put release notes and migration warnings on the cover page, not in component names.

## Variables and modes

Create a collection named `LC / Semantic` with `Light` and `Dark` modes. Mirror CSS variable names without leading dashes:

```text
color/background
color/foreground
color/card
color/card-foreground
color/popover
color/popover-foreground
color/primary
color/primary-foreground
color/secondary
color/secondary-foreground
color/muted
color/muted-foreground
color/accent
color/accent-foreground
color/destructive
color/destructive-foreground
color/border
color/input
color/ring
color/sidebar/*
```

Create `LC / Scale` for shared dimensions:

- spacing: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 72, 80, 96;
- radius: 6, 8, 10, 14, 16, 24, 28, full;
- control heights: 32, 36, 40, 44, 48, 56, 64;
- layout widths: 80 collapsed sidebar, 256 sidebar, 320/420/560/720 panels, 448 auth, 680 reader, 896 copy/image, 1024 detail, 1152 content.

Use aliases from component variables to semantic variables. Do not duplicate raw green or neutral values in components.

Create separate `LC / Reader` variables for palette options and derived roles. Use modes or variable scopes for preset backgrounds only if the team needs live switching in prototypes; otherwise use component properties with documented values.

## Styles

Text styles:

- `UI/Hero/Mobile`, `UI/Hero/Desktop`;
- `UI/Page title`, `UI/Section`, `UI/Panel title`;
- `UI/Body`, `UI/Body small`, `UI/Label`, `UI/Metadata`;
- `Editorial/Cover title`, `Editorial/Cover author`;
- `Reader/Page title`, `Reader/Summary`, `Reader/Body`, `Reader/H1` through `H6`.

Use Inter for UI styles. Use Georgia as the default reader/cover sample. Preserve line height and tracking, not just font size.

Effect styles:

- `Elevation/XS`, `SM`, `MD`, `LG`, `XL`, `2XL` matching the foundation ladder;
- `Overlay/Black 45`;
- `Image/Cover title shadow`.

## Component library

Build components with Auto Layout and variants. Minimum set:

### Button

Properties:

- variant: default, secondary, outline, ghost, neutral ghost, neutral link, link, destructive, destructive outline, destructive ghost;
- size: small, default, large, hero, icon, FAB;
- state: default, hover, focus, disabled, loading;
- icon: none, leading, trailing, only.

### Field

Properties: type, state, value/placeholder, leading/trailing content, stacked group position.

### Segmented control

Nested item with selected, hover, focus, disabled. Allow two to five items.

### Panel

Properties: padding, header, description, actions, footer, state. Keep body as a slot.

### Navigation

Sidebar expanded/collapsed, nav row active/default, mobile bottom item active/default, toolbar public/app.

### Modal

Properties: presentation modal/panel, anchor, size, title/subtitle, actions, footer, mobile/desktop. Full-screen mobile is a component variant, not a detached mockup.

### Editorial

Book cover, book grid card, detail cover, metadata row, contents row, progress, reader header, reader navigator, translation popover, playback bar, preference swatch.

## Responsive frames

Maintain representative frames:

- mobile: 390 × 844;
- compact tablet/breakpoint: 768 × 1024;
- desktop: 1280 × 720 or taller.

Use min/max constraints that match code:

- public content 1152;
- app sidebar 256/80;
- reader 680;
- auth 448;
- book detail 1024.

Prototype the `md` shell change explicitly. Do not create a scaled-down desktop sidebar for mobile.

## Prototyping

Prototype these interactions because static frames hide important design contracts:

- sidebar collapse;
- mobile bottom nav and More drawer;
- modal vs side panel at mobile/desktop;
- theme segmented control;
- bookshelf → detail → reader;
- reader title change on scroll;
- reader contents/preferences panels;
- translation popover on desktop and edge-to-edge mobile;
- playback FAB → player → settings.

Use 200 ms smart animate for small state changes and 300 ms for panels. Avoid smart-animate artifacts on reader text.

## Handoff and tools

Figma Variables are the source for design-mode semantics. Dev Mode names must match CSS tokens and component variant names.

Recommended tools:

- Figma Variables and component properties: required;
- Dev Mode: inspect values and compare names;
- Tokens Studio: optional for importing/exporting `assets/starter/tokens-studio.json` or syncing a multi-platform token pipeline;
- Storybook: optional in a destination project for component fixtures, but do not add it solely to satisfy the design system;
- browser computed styles and screenshots: verify implemented values against Figma.

Handoff checklist:

1. Every color is a semantic variable or documented editorial exception.
2. Auto Layout reflects real flex/grid behavior.
3. Component properties map to code props/variants.
4. Light and dark modes are shown.
5. Mobile and desktop behavior is shown.
6. Focus, disabled, loading, error, empty, and selected states exist.
7. Long-content examples prove truncation and wrapping.
8. Notes identify safe-area, sticky, fixed, and independent-scroll behavior.

Do not use a plugin-generated code export as production source. Use it as a measurement aid, then implement with the shared primitives.
