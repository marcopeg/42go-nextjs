# Abstract Panel Component [aec]

Create a reusable "Panel" (or "CardPanel") component to replace the repeated markup used in the Profile page (account information, preferences, security, RBAC session blocks). The goal is to centralize styling (rounded border, padding, background, heading, optional toolbar/actions, sections list) and make future dashboard pages faster to build and themable.

## Goals

- [x] Identify repeated panel structure in `src/app/(app)/profile/page.tsx`
- [x] Design a flexible API (props / slots) for a Panel component
- [x] Support: title, subtitle/description, optional header actions (buttons), body content
- [x] Support simple layout helpers (stack spacing) without forcing opinionated content
- [x] Ensure dark/light theme compatibility using existing design tokens/classes
- [x] Replace existing panels in Profile page with new component
- [x] Add example via inline JSDoc in `SimplePanel.tsx`

## Acceptance Criteria

- [x] New component file added under `src/42go/components/panel/`
- [x] Props documented with TS types & JSDoc (title, description, actions, className, children, as?)
- [x] Renders identical UI compared to previous hardcoded panels
- [x] Profile page uses new component for Account, Preferences, Security, RBAC Session, Special Data
- [x] No duplication of previous panel markup left (all replaced)
- [x] QA passes locally (lint/build) (visual verification performed)
- [x] Usage example in JSDoc (`SimplePanel.tsx`)

## Notes / Open Questions

All placeholders resolved. Decisions below.

### Naming

"Panel" wins (short, neutral, not conflicting with existing `Card` from shadcn). File/dir: `src/42go/components/panel/`.

### Component Shape (SRP + Simple Wrapper)

SRP primitives (each in its own file):
`Panel` (root container + context only), `PanelHeader`, `PanelTitle`, `PanelDescription`, `PanelActions`, `PanelBody`, `PanelFooter` (future use).

Provide a convenience wrapper `SimplePanel` that wires: root + header (title/description/actions) + body. Profile page will mainly use `SimplePanel`.

### Props (Root vs SimplePanel)

Panel (root): `children`, `as?`, `variant? ('default'|'muted'|'outline')`, `padding? ('none'|'sm'|'md')`, `gap? ('none'|'sm'|'md'|'lg')`, `className?`.

Context exposes variant/padding/gap.

SimplePanel adds sugar: `title?`, `description?`, `actions?`, plus optional policy props (see Policy Integration). It may accept `bodyClassName?`, `headerClassName?` for convenience; root `Panel` stays minimal.

### Sub-Components Contract (SRP)

- `PanelHeader`: flex layout; left stack (Title + Description) right actions. Hidden logic lives in caller (SimplePanel decides to render it or not).
- `PanelTitle`: semantic heading (default h3; prop to override via `as` if needed later).
- `PanelDescription`: subdued text styling.
- `PanelActions`: flex gap-2 wrapper.
- `PanelBody`: applies vertical spacing class derived from context gap.
- `PanelFooter`: reserved placeholder.

### Styling

Base classes replicate existing markup: `rounded-lg border bg-card`. Padding applied at root unless `padding='none'`. Body adds vertical spacing via `space-y-*`. Allow additional classes via `className` merge (use existing utility `cn` if present; else implement small helper).

### Accessibility

`SimplePanel` ensures no empty header (skips entirely if no title & no actions). Title defaults to h3; can later add `titleAs` if required. Actions container has `aria-label="panel actions"`. Primitives themselves do not guess semantics; they just render wrappers.

### Edge Cases

1. No title & no actions → header omitted; only body rendered.
2. Passing both sugar props and explicit `<Panel.Header>` → explicit header wins (documented warning in JSDoc).
3. actions as array vs fragment → always flattened inside flex.
4. variant unsupported value (TS guards) → compile error.
5. Nested Panels: allowed, spacing controlled independently (no collapsing issues).

### Theming

Relies on existing token classes (`bg-card`, `border`, text utilities). Variants future-ready: `muted` might map to `bg-muted`; `outline` maybe lighter background + stronger border. For now they alias to default but included in type to avoid breaking change later.

### Future Enhancements (Out of Scope Now)

- Collapsible / expandable
- Loading & skeleton state
- Status badge / icon slot
- Async error state block

### Risks / Mitigations

- Over-engineering: kept API small; future features additive.
- Name collision: avoid `Card` since shadcn has one.
- CSS drift: centralizing ensures single source, add usage comment in file.

### Policy Integration

Implemented on `SimplePanel` via optional props `policy`, `renderOnLoading`, `renderOnError`.
Full panel is wrapped in `ProtectComponent` so if policy fails the ENTIRE panel (header + body) is omitted (returns null unless custom error renderer provided). This matches requirement for protected sections to disappear entirely for unauthorized users.

### Implementation Plan (High-Level)

1. Create directory `src/42go/components/panel/`.
2. Implement `PanelContext.tsx` + `Panel.tsx` root.
3. Implement primitives (`PanelHeader.tsx` etc.) each exporting a single component.
4. Implement `SimplePanel.tsx` using primitives + optional policy support.
5. Barrel `index.ts` exporting everything.
6. Refactor `profile/page.tsx` using `SimplePanel` for Account, Preferences, Security, RBAC Session. (Special Data stays with existing `ProtectComponent`.)
7. Run `npm run qa` & fix issues.
8. Add inline usage example comment in `SimplePanel.tsx`.

All unknowns answered; task ready to plan/execute.

## Implementation Summary

Implemented SRP primitives + `SimplePanel` sugar wrapper. Replaced all hardcoded panels on profile page. Added policy integration that hides panel entirely when not authorized. Inline example documents API. Future variants & enhancements left as TODO comments.

Task complete.

## Development Plan

### 1. File Structure

Create directory `src/42go/components/panel/` with files:

- `PanelContext.tsx` – React context + provider with variant/padding/gap types.
- `Panel.tsx` – Root container applying border, bg, rounded, padding (unless none) and providing context.
- `PanelHeader.tsx` – Flex container, spacing classes, merges className.
- `PanelTitle.tsx` – Heading element (`h3`), optional `as` later (not now) kept simple.
- `PanelDescription.tsx` – Paragraph subdued styling.
- `PanelActions.tsx` – Flex gap-2 row, right-aligned when inside header (header handles layout).
- `PanelBody.tsx` – Wrapper applying vertical spacing (gap) + optional extra classes.
- `PanelFooter.tsx` – Placeholder simple wrapper (not necessarily used yet).
- `SimplePanel.tsx` – Combines root + header + body; handles `title`, `description`, `actions`, optional `policy` props.
- `index.ts` – Barrel exports.

### 2. Types & Props

Define shared `PanelVariant`, `PanelPadding`, `PanelGap` union types in `PanelContext.tsx`.
Context value: `{ variant, padding, gap }`.
`Panel` props: `{ children, as?, variant?, padding?, gap?, className? }`.
`SimplePanel` props extend root + `{ title?, description?, actions?, policy?, renderOnLoading?, renderOnError?, bodyClassName?, headerClassName? }`.
Policy types imported from `@/42go/policy/types` and enforcement via `ProtectComponent` from `@/42go/policy/client` (or direct path if needed).

### 3. Implementation Details

Helper `cn` imported from existing utility `@/lib/utils` (prefer existing not duplicating). Fallback if path differing (verify actual path; we saw `src/lib/utils.ts`).
Variants: all map to same classes now; leave TODO comments for future differentiation.
Padding mapping: none→`p-0`, sm→`p-4`, md→`p-6`.
Gap mapping (for body): none→no `space-y-*`, sm→`space-y-2`, md→`space-y-4`, lg→`space-y-6`.
`Panel` adds base: `rounded-lg border bg-card` plus padding class if not none.
`PanelHeader` spacing bottom margin `mb-4` only if it has at least a title/description or actions (SimplePanel ensures not rendered if empty). Provide class merge.
`SimplePanel` logic:

- If `policy` provided, wrap body content (or entire panel?) — decision: hide whole panel when not passing policy. Implementation: build inner Panel tree; if policy fails, return `null` or the provided `renderOnError` result. Use `ProtectComponent` with custom renders to fully control.
- Provide default loading = null.

### 4. Refactor Profile Page

Replace raw `<div className="rounded-lg border p-6 bg-card">` blocks with `<SimplePanel title="...">` forms.
Account panel body becomes children; button remains.
Preferences panel; Security panel.
RBAC Session panel uses actions: pass actions React fragment with two buttons.
Special Data stays with existing `ProtectComponent` (no change) OR optionally replaced with `SimplePanel policy={...}` (decide quickly—initial pass keep as-is to limit scope).

### 5. Documentation

Add top-of-file JSDoc in `SimplePanel.tsx` including quick usage example.
Add short comment referencing future variants/badges.

### 6. QA

Run `npm run qa` fix any lint or type issues.

### 7. Acceptance Validation Checklist

Visually inspect Profile page to confirm layout unchanged.
Ensure no leftover raw panel markup (search for `rounded-lg border p-6 bg-card` in profile page).
Confirm type exports accessible via `import { SimplePanel } from '@/42go/components/panel';`.

### 8. Out of Scope (Explicit)

Collapsible, skeleton, status badges, heading level override, footer content usage.

### 9. Risk Mitigation

Keep components tiny – each < ~40 lines.
Central mapping objects for padding/gap ensure consistency & easy tweak.

---

Ready to execute.
