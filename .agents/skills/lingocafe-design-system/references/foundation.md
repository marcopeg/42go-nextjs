# Foundations

## Contents

- Design character
- Color tokens
- Typography
- Spacing and sizing
- Shape and elevation
- Iconography and imagery
- Motion
- Accessibility

## Design character

LingoCafe combines three visual modes without mixing their jobs:

1. **Product shell:** neutral, compact, low-noise, and familiar.
2. **Book discovery:** image-led and editorial, with cover typography and strong gradients.
3. **Reading canvas:** calm, spacious, typographically rich, and user-adjustable.

Prefer clarity over decoration. Use borders and spacing before shadows. Give one action or content object visual dominance per region.

## Color tokens

Use CSS custom properties and Tailwind semantic classes. Store colors in OKLCH so light/dark interpolation stays perceptually stable.

### Light mode

| Token | Value | Role |
|---|---:|---|
| `--background` | `oklch(1 0 0)` | Page and shell |
| `--foreground` | `oklch(0.145 0 0)` | Primary text |
| `--card` | `oklch(1 0 0)` | Panels and cards |
| `--card-foreground` | `oklch(0.145 0 0)` | Card text |
| `--popover` | `oklch(1 0 0)` | Menus and popovers |
| `--primary` | `oklch(63.982% 0.1973 145.119)` | LingoCafe green |
| `--primary-foreground` | `oklch(0.985 0 0)` | Text on green |
| `--secondary`, `--muted`, `--accent` | `oklch(0.97 0 0)` | Quiet surfaces |
| `--muted-foreground` | `oklch(0.556 0 0)` | Secondary text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Destructive action/error |
| `--border`, `--input` | `oklch(0.922 0 0)` | Hairlines and fields |
| `--ring` | `oklch(0.708 0 0)` | Focus |
| `--sidebar` | `oklch(0.985 0 0)` | Sidebar surface |

### Dark mode

| Token | Value | Role |
|---|---:|---|
| `--background` | `oklch(0.15 0.02 250)` | Deep blue-neutral shell |
| `--foreground` | `oklch(0.985 0 0)` | Primary text |
| `--card`, `--popover`, `--sidebar` | `oklch(0.205 0 0)` | Raised surfaces |
| `--secondary`, `--muted`, `--accent` | `oklch(0.269 0 0)` | Quiet surfaces |
| `--muted-foreground` | `oklch(0.708 0 0)` | Secondary text |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Destructive action/error |
| `--border` | `oklch(1 0 0 / 10%)` | Hairlines |
| `--input` | `oklch(1 0 0 / 15%)` | Fields |
| `--ring` | `oklch(0.556 0 0)` | Focus |

Keep `--primary` and `--primary-foreground` inherited from light mode unless a theme proves that their contrast fails.

### Semantic use

- Primary green: main CTA, selected control, active reading action, switch on-state.
- Neutral foreground/muted: navigation, metadata, supporting actions.
- Destructive red: errors, delete, irreversible actions only.
- Blue `#3b82f6`: reader scroll progress only. Do not make it a second brand color.
- Emerald `600/500`: book-reading CTA and “currently reading” badge; this is intentionally close to the primary brand.
- Amber-white overlays: book-cover titles and metadata over dark gradients.

Avoid decorative gradients in general UI. Gradients belong on cover-image readability overlays.

## Typography

### UI font

Use local Inter Variable, weights 100–900, with `font-display: swap`. Fallback:

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

### UI scale

| Role | Size / line | Weight | Notes |
|---|---|---:|---|
| Hero H1 mobile | 36 / 40 px | 700 | Tight tracking |
| Hero H1 desktop | 60 / 60 px | 700 | `-0.025em` tracking, max 896 px |
| Page toolbar title | 18 / tight | 600 | Single line when possible |
| Section heading | 16–18 / 24–28 px | 600 | Minimal tracking |
| Panel/dialog title | 18 / 28 px | 600 | |
| Body | 16 / 24 px | 400 | Default |
| Compact body/control | 14 / 20 px | 400–500 | Most product UI |
| Metadata/nav label | 12 / 16 px | 500 | |
| Tiny badge/source | 10–11 px | 600–700 | Uppercase sparingly |

Use sentence case. Avoid uppercase except compact status badges.

### Editorial typography

- Book-cover title: system serif, 17 px mobile to 24 px grid; 24–36 px detail; bold, tight line height.
- Reader default: Georgia at 21 px with paragraph line-height `1.85`.
- Reader page title: `1.7 × body size`, weight 600, line-height `1.02`, tracking `-0.03em`.
- Reader summary: `0.9 × body size`, at least 14 px, italic, muted.
- Reader content headings use the selected reader font and relative sizes from `0.92em` to `2em`.

## Spacing and sizing

Use a 4 px base grid. Preferred steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 72, 80, 96.

- General page padding: 24 px desktop and normal app mobile.
- Reader mobile horizontal padding: 20 px.
- Public content horizontal padding: 24 px.
- Control gaps: 6–8 px.
- Panel internal gap: 16 px; roomy sections: 24–32 px.
- Toolbar/public header: 56 px.
- App header/sidebar row/mobile bottom nav: 64 px.
- Minimum comfortable touch target: 44 px. Compact icon buttons may be 36–40 px when surrounding spacing remains safe.

## Shape and elevation

Set `--radius: 0.625rem` (10 px). Derived radii:

- small: 6 px;
- medium: 8 px;
- large: 10 px;
- extra large: 14 px.

Use 8–10 px for normal controls, cards, panels, and covers. Use 16 px for floating playback and preference cards. Use 24–28 px only for immersive reader sub-surfaces. Pills are reserved for status, circular controls, and compact metadata.

Elevation ladder:

- `shadow-xs`: buttons and inputs;
- `shadow-sm`: cards and static framed surfaces;
- `shadow-md`: small floating sidebar toggle;
- `shadow-lg`: floating player/settings;
- `shadow-xl`: centered dialog;
- `shadow-2xl`: full panel/modal shell.

Do not put a shadow on every container.

## Iconography and imagery

- Use Lucide, normally stroke 2, at 16 px inside controls, 20 px in navigation, and 24 px for high-emphasis actions.
- Keep icon and label gaps at 6–8 px.
- Product screenshots and book covers carry visual personality. UI chrome stays quiet around them.
- Book covers use `aspect-ratio: 2 / 3`, object-cover, top and bottom black gradients, warm white cover text, and subtle drop shadows.
- Preserve source aspect ratio. Never stretch marketing or cover imagery.

## Motion

- Standard transitions: 150–200 ms for color/opacity/hover; 300 ms for sidebar, panel, and preference reveal.
- Use ease-out for entering and ease-in for leaving.
- Hover lift on book cards: at most 2 px.
- Public-page reveal may use fade, scale, or slide-up with short staggered delays.
- Keep reader navigation and text stable. Avoid ornamental motion while reading.
- Respect reduced-motion preferences when adding new animation.

## Accessibility

- Maintain at least 4.5:1 contrast for normal text. Reader foreground choices are filtered by this threshold.
- Give every icon-only control an accessible label.
- Use `aria-pressed`, `aria-selected`, or `aria-checked` for stateful controls.
- Use a 2–3 px focus ring with ring offset against the current background.
- Do not encode status by color alone.
- Preserve semantic heading order and navigation landmarks.
- Keep overlays focus-managed and keyboard dismissible unless intentionally non-dismissible.
