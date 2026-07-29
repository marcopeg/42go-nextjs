# Implementation and Portability

## Contents

- Canonical stack
- Repository architecture
- Starter assets
- New-project bootstrap
- Coding patterns
- Validation
- Source anchors

## Canonical stack

Preferred web stack:

- React 19 and Next.js App Router;
- TypeScript;
- Tailwind CSS 4 and `@tailwindcss/postcss`;
- shadcn/ui New York style, neutral base, CSS variables;
- Radix Dialog, Dropdown Menu, Popover, and Slot;
- `class-variance-authority`, `clsx`, `tailwind-merge`;
- Lucide React;
- `next-themes`;
- `tw-animate-css`;
- Sonner for toasts;
- React Markdown for content and reader text.

Equivalent frameworks are acceptable if they preserve token names, component semantics, responsive behavior, and accessibility.

## Repository architecture

Keep these layers separate:

```text
app/tokens.css                 semantic values and light/dark modes
app/tailwind.css               Tailwind token mapping and base focus rules
public/app-themes/<id>/        optional per-app token overrides
components/ui/                 low-level shadcn/Radix primitives
42go/components/              reusable composed components
42go/layouts/                 public and authenticated shells
config/<app>/                 app brand, toolbar, menu, pages, theme
app/.../_components/          domain components such as books and reader
```

Load the default tokens first, then an app-specific stylesheet. Keep app overrides sparse. LingoCafe currently inherits the shared green theme.

## Starter assets

`assets/starter/` contains portable source material:

- `tokens.css`: light/dark semantic values;
- `tailwind.css`: Tailwind 4 mapping and focus baseline;
- `button.tsx`: canonical action variants and sizes;
- `reader-theme.ts`: reader choices, contrast filtering, and derived styles;
- `tokens-studio.json`: portable token values for Figma/Tokens Studio workflows.

Copy these into a new project and adapt import aliases only. Do not casually rename semantic variables; stable names are the bridge between Figma, components, and theme modes.

The canonical LingoCafe UI icon is in `assets/brand/lingocafe-ui.png`. Use it only when the destination should carry LingoCafe branding. Otherwise replace the mark while preserving its 24 px shell slot and 180 px landing treatment.

Inter is available from Google Fonts and in the source project under `src/app/fonts/inter/`. A copied skill does not need to redistribute the font binary; install Inter locally or use the official package/source and retain the same fallback stack.

## New-project bootstrap

1. Install the canonical stack or framework equivalents.
2. Load Inter Variable and expose it as `--font-inter`.
3. Copy `tokens.css` and `tailwind.css`; ensure tokens load before Tailwind utilities.
4. Install shadcn with New York style, neutral base, CSS variables, and Lucide icons.
5. Copy/adapt `button.tsx` before building higher-level actions.
6. Implement `Panel`, input, segmented control, and shared Modal.
7. Implement the public shell and authenticated shell.
8. Add book/editorial and reader layers only when needed.
9. Create light and dark visual fixtures for every shared component.
10. Validate mobile and desktop layouts plus keyboard interaction.

Recommended install set:

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-popover @radix-ui/react-slot class-variance-authority \
  clsx tailwind-merge lucide-react next-themes sonner react-markdown
npm install -D tailwindcss @tailwindcss/postcss tw-animate-css
```

Use the current compatible versions in the destination. Do not copy version pins blindly.

## Coding patterns

- Use arrow functions and explicit named exports except framework-required defaults.
- Use absolute aliases.
- Use `cn()` for conditional classes.
- Put stable variants in CVA rather than at call sites.
- Use semantic classes (`bg-card`, `text-muted-foreground`) instead of raw gray values.
- Keep hard-coded colors inside brand/editorial exceptions or reader palettes.
- Use client-only authenticated pages with the shared `AppLayout` in this repository.
- Fetch protected page data in the browser with same-origin credentials.
- Reuse shared Modal for dialogs, sheets, panels, drawers, and fullscreen overlays.
- Keep complex components in container/presentation/logic modules.

Avoid:

- unrelated UI libraries with competing token systems;
- arbitrary radii and shadows per component;
- `bg-white dark:bg-gray-*` when a semantic surface exists;
- primary-colored cancel or close controls;
- desktop-first fixed widths that break the mobile shell;
- bespoke overlays or unscoped z-index escalation.

## Validation

For every meaningful UI change:

1. Run lint and production build (`npm run qa` in the source repository).
2. Check widths near 390, 768, and 1280 px.
3. Check light and dark modes.
4. Check keyboard order, visible focus, Escape, and overlay focus behavior.
5. Check long titles, empty data, loading, error, and disabled states.
6. Check that sticky/fixed controls do not cover scrollable content.
7. Compare computed tokens and major dimensions with the references.
8. Use the source repository’s ngrok test URL for visual checks when available.

## Source anchors

When working inside the original repository, treat these as code authority:

- `src/app/tokens.css`
- `src/app/tailwind.css`
- `src/components/ui/button.tsx`
- `src/42go/layouts/public/`
- `src/42go/layouts/app/`
- `src/42go/components/modal/`
- `src/42go/components/panel/`
- `src/42go/components/PlainList/`
- `src/config/lingocafe/`
- `src/app/(app)/(lingocafe)/books/`

If source and this skill disagree after an intentional accepted design change, update the skill. If the mismatch is accidental drift, restore the documented system.
