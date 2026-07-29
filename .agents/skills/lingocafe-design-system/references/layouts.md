# Layouts

## Contents

- Responsive contract
- Public shell and marketing
- Authentication
- Authenticated application shell
- Bookshelf
- Book details
- Reader
- Profile and settings

## Responsive contract

Design mobile first. Use the Tailwind `md` breakpoint at 768 px for the major shell switch.

- Mobile favors full-width surfaces, fixed bottom navigation, and full-screen detail/overlays.
- Desktop favors a left sidebar, fixed page header, contained reading/detail widths, and right-side panels.
- Avoid horizontal page scrolling. Apply `min-w-0` to grid/flex children that contain book titles or long text.
- Use `100dvh` for full-height mobile surfaces and safe-area environment variables for floating controls.

## Public shell and marketing

Public shell:

- Full-height flex column.
- Sticky 56 px header, `z-50`, 1 px bottom border.
- Header background: `background / 95%`, or `60%` when backdrop blur is supported.
- Header horizontal padding: 16 px.
- Wordmark: bold title plus 12 px muted subtitle, 8 px gap, optional 24 px icon.
- Right actions: compact 32 px high buttons, 8 px gap.
- Footer: 1 px top border, 20 px vertical padding, centered 12 px muted links with 16 px horizontal gap.

Marketing composition:

- Content maximum: 1152 px (`max-w-6xl`), 24 px side padding.
- Hero copy maximum: 896 px. Center it for LingoCafe.
- Hero starts generously below the toolbar: roughly 112 px mobile, 72 px desktop.
- Hero CTA sits 16 px below copy. Use one primary action unless a real secondary path exists.
- Large product imagery may use max 896 px or 1152 px and no ornamental frame when the art already contains a device/screen.
- Screenshot strip: two columns mobile, four desktop; 12 px mobile and 32 px desktop gap.
- Long explanatory copy: max 896 px.

## Authentication

- Center a single column, maximum 448 px (`max-w-md`), 32 px top margin, 24 px padding.
- H1: 24 px bold centered, 24 px bottom margin.
- Stack providers and credential flows at 12–16 px gaps.
- Social buttons: full width, 44 px high, 2 px border.
- Main credential action: full width, 48 px high, 18 px label.
- Group related credential inputs inside one 8 px rounded border; divide stacked inputs with a hairline.
- Place the provider divider label on the page background so the horizontal rule visually stops behind it.
- Cancel is a neutral text action, never a primary-colored secondary CTA.

## Authenticated application shell

### Desktop

- Fixed left sidebar: 256 px expanded, 80 px collapsed.
- Fixed/occupying header: 64 px high, 24 px horizontal padding, 1 px bottom border.
- Main content shifts with the sidebar and uses 24 px top/side padding by default.
- Sidebar uses background at 95% with subtle blur, 1 px right border, and a 300 ms width transition.
- Sidebar header is 64 px. Navigation uses 12 px horizontal container padding and 4 px row gaps.
- Navigation rows: rounded 6–8 px, 12 px horizontal and 8 px vertical padding, 14 px text, 20 px icons.
- Active nav: bold foreground on very soft accent. Hover may introduce a primary border and slight label indent.
- User row sits in a 64 px bottom zone. Avatar is a 20 px neutral circle with an initial.

### Mobile

- Header remains 64 px.
- Fixed bottom navigation: 64 px, translucent background, blur, top border, `z-40`.
- Each item stacks a 20 px icon and 12 px medium label.
- Optional “More” opens a right drawer at 80% viewport width over a black 60% scrim.
- Hide bottom navigation for immersive book detail/reader flows.
- Account and Books are LingoCafe’s two primary mobile destinations.
- For first-content plain lists that meet the toolbar, set `flushMobileTop` on
  both `AppLayout` and `PlainList`; do not use a negative vertical margin to
  cancel shell padding.

### Sticky footer

When a page needs persistent actions, use a 64 px fixed footer matching the header surface and border. Add content padding so neither footer nor bottom nav covers the page.

## Bookshelf

- Page title: “Bookshelf”; optional language flag action on the right.
- Content sections: 24 px gap; large groups: 32 px gap.
- Grid: 2 columns mobile, 3 at `sm`, 4 at `lg`, 5 at `xl`; 16 px gap.
- Section heading: 16 px mobile, 18 px larger, weight 600.
- Card width follows the grid. Never force a fixed pixel width.
- Separate “Currently Reading” from “Catalog”; omit empty section headings.
- Loading, empty, and incomplete-profile states use a simple bordered card with 20 px padding.

## Book details

### Mobile

- Replace the normal shell with a fixed full-screen surface at high z-index.
- Header: back icon + “Book details”, border bottom, 16 px padding.
- Scroll body independently with 16 px horizontal and 20 px vertical padding.
- Cover fills available width while preserving 2:3 ratio.
- Reading CTA sticks to the bottom on a translucent background.

### Desktop

- Keep overall content at max 1024 px, with extra 40 px left breathing room inside the page.
- Two-column grid: 224 px cover + content; increase cover to 256 px at `lg`.
- Gap: 40 px at `md`, 56 px at `lg`.
- Cover column becomes sticky 96 px from viewport top.
- Content uses 20 px vertical rhythm.
- Reading CTA aligns right and is 256 px wide.
- Contents rows group parts and chapters inside lightly tinted bordered containers.

## Reader

The reader is a full-viewport panel above the normal app shell. It uses no normal page padding.

### Shared structure

- Independent reader theme variables control background, foreground, muted text, hover, highlight, popover, and border.
- Header has a bottom border and 2 px blue scroll-progress line.
- Header center title switches from book title to page title based on scroll. It must remain centered between asymmetric side actions.
- Use icon actions for back, preferences, and contents.
- Long-form column maximum: 680 px.
- Page navigation sits below content; playback floats over the viewport.

### Desktop reader

- Header: 68 px, 32 px horizontal padding.
- Reading column top padding: 96 px; bottom padding: 96 px.
- Optional language/level pill appears beside back.
- Scrolling happens inside the reader surface, not the document.

### Mobile reader

- Header: 64 px, 12 px horizontal padding.
- Scroll container: 20 px horizontal, 24 px vertical padding.
- Reading article adds 40 px top and 64 px bottom padding.
- Support horizontal swipe navigation only when movement is clearly horizontal and no text selection is active.
- Translation popover becomes edge-to-edge on small screens.

## Profile and settings

- Stack panels with 20–24 px vertical gap.
- Keep normal panels at 24 px padding; use 16 px on cramped mobile surfaces if needed.
- Use segmented data pickers for mutually exclusive appearance, level, and other setting values.
- Use flat navigation tabs only when switching between peer subviews inside the settings surface.
- Use card grids for image/flag-heavy choices.
- Keep the save action in the page toolbar when changes span multiple panels.
