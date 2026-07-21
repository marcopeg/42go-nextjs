---
name: lingocafe-design-system
description: "Maintain, extend, review, or reproduce the LingoCafe visual design system. Use for any UI or frontend work: creating or changing React components, pages, layouts, navigation, styling, Tailwind classes, shadcn/Radix primitives, themes, responsive behavior, accessibility, Figma designs, visual QA, or copying the LingoCafe look into another project. Also use whenever a change may introduce a reusable visual token, component, layout, interaction, or reader pattern; detect design-system drift and ask whether novel stable changes should be integrated into this skill."
---

# LingoCafe Design System

Build interfaces that feel like LingoCafe: quiet application chrome, confident green actions, editorial book imagery, and a distraction-free reading canvas.

## Load the right references

Read these files before making design decisions:

1. Always read [foundation.md](references/foundation.md).
2. Read [layouts.md](references/layouts.md) for any page, shell, responsive, navigation, marketing, bookshelf, detail, or reader layout.
3. Read [components.md](references/components.md) for controls, panels, cards, overlays, feedback, or new reusable components.
4. Read [reader.md](references/reader.md) for books, long-form reading, translation, playback, and reader preferences.
5. Read [implementation.md](references/implementation.md) when writing code, porting the system, choosing libraries, or starting a new project.
6. Read [figma.md](references/figma.md) for Figma creation, component modeling, variables, or design handoff.

Do not load irrelevant references. Do not invent a new visual language when a documented pattern fits.

## Core rules

- Use semantic tokens. Never scatter hard-coded brand or theme colors through general UI.
- Keep the shell neutral. Reserve green for primary actions, selection, and meaningful progress.
- Use Inter for product UI. Use the selected reader font only inside the reading canvas. Use a serif on book covers when it improves the editorial feel.
- Use a 4 px spacing rhythm, compact controls, thin borders, moderate radii, and restrained shadows.
- Use Lucide icons. Keep icons subordinate to labels and meaning.
- Design mobile first. Switch to the desktop shell at `md`/768 px unless the surrounding project establishes another breakpoint.
- Preserve light and dark modes. Check both.
- Preserve action semantics across hover and focus states. Cancel is neutral. Destructive stays red. Primary stays brand-colored.
- Prefer existing shared primitives over bespoke controls. Extend a primitive when the behavior is reusable.
- Meet WCAG AA contrast. Keep keyboard navigation, visible focus, semantic HTML, and accessible names.

## Work sequence

1. Inspect the target surface and nearby canonical components.
2. Classify it as public/marketing, authenticated shell, bookshelf/detail, reader, or overlay.
3. Select the documented layout and component patterns.
4. Implement structure first, then tokens, responsive behavior, states, and motion.
5. Check loading, empty, error, disabled, hover, focus, active, and dark-mode states.
6. Verify at mobile and desktop widths. For this repository, use `https://lc42go.ngrok.app/` for visual checks when available.
7. Run the repository quality gate after code changes.

## Replicate in another project

Start from [implementation.md](references/implementation.md) and copy only the needed files from `assets/starter/`. Preserve the token names and semantic component behavior even if the framework differs. Match visual roles, dimensions, and responsive behavior rather than copying incidental DOM structure.

## Maintain this skill

Treat this skill as the design-system source of truth.

After any UI intervention, compare the result with the references. A change is a candidate for integration when it adds or materially changes any of these:

- semantic token, typography rule, spacing, radius, elevation, or motion rule;
- reusable control, card, panel, overlay, navigation, feedback, or content pattern;
- public, app-shell, mobile, bookshelf, detail, or reader layout behavior;
- accessibility contract or action semantics;
- Figma variable, style, component, variant, or handoff rule.

If a candidate exists and the user did not already request documentation, ask one concise question before ending the task: name the new pattern and ask whether to integrate it into `$lingocafe-design-system`. Do not silently rewrite the design system based on a one-off experiment.

Do not ask for content-only edits, copy changes, data wiring, or bug fixes that leave the visual contract unchanged. When the user approves integration, update the smallest relevant reference and any affected starter asset, then run the skill validator.
